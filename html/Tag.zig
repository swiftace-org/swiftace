//! Struct for representing HTML tag elements

// TODO
// [ ] Figure out logging for invalid input (log.warn ?)

const std = @import("std");
const util = @import("./util.zig");
const Attribute = @import("./Attribute.zig");
const Element = @import("../html.zig").Element; 
const mem = std.mem;
const Allocator = mem.Allocator;
const ArrayList = std.ArrayList;

const Tag = @This();

name: []const u8,
is_void: bool = false,
attributes: []const Attribute = &.{},
contents: []const Element = &.{}, // could be *const Element, but there's a bug
allocator: mem.Allocator,

pub fn init(allocator: Allocator, input: anytype) !Tag {
    const input_type: type = @TypeOf(input);
    const info = @typeInfo(input_type);
    if (info != .Struct or !info.Struct.is_tuple) @compileError("Expected tuple. Received: " ++ @typeName(input_type));
    if (input.len == 0 or input.len > 4) @compileError("Expected 1 to 4 fields. Received: " ++ input.len);
    if (comptime !util.isZigString(@TypeOf(input[0]))) @compileError("Expect start tag to be a string. Received: " ++ @typeName(@TypeOf(input[0])));

    const name = try extractName(input[0]);

    // Void tag without attributes
    if (input.len == 1) return .{ .name = name, .is_void = true, .allocator = allocator };

    if (input.len == 2) {
        // Non-void tag without attributes or children
        if (comptime util.isZigString(@TypeOf(input[1]))) {
            if (!matchEndTag(name, input[1])) return error.HtmlParseError;
            return .{ .name = name, .allocator = allocator };
        }
        // Void tag with attributes
        const attributes = try Attribute.initAll(allocator, input[1]);
        return .{ .name = name, .is_void = true, .attributes = attributes, .allocator = allocator };
    }

    if (input.len == 3) {
        if (!matchEndTag(name, input[2])) return error.HtmlParseError;

        // Non-void tag with attributes, but no contents
        if (comptime Attribute.canInitAll(@TypeOf(input[1]))) {
            const attributes = try Attribute.initAll(allocator, input[1]);
            return .{ .name = name, .attributes = attributes, .allocator = allocator };
        }

        // Non-void tag with contents, but no attributes
        const elements = try Element.initAll(allocator, input[1]);
        return .{ .name = name, .contents = elements, .allocator = allocator };
    }

    // Non-void tag with attributes and contents
    if (!matchEndTag(name, input[3])) return error.HtmlParseError;
    const attributes = try Attribute.initAll(allocator, input[1]);
    const elements = try Element.initAll(allocator, input[2]);
    return .{ .name = name, .attributes = attributes, .contents = elements, .allocator = allocator };
}

// pub fn canInit(input: anytype) bool {
//     const input_type: type = @TypeOf(input);
//     const info = @typeInfo(input_type);
//     if (info != .Struct or !info.Struct.is_tuple) return false;
//     if (input.len == 0 or input.len > 4) return false;
//     if (comptime !util.isZigString(@TypeOf(input[0]))) return false;
//     _ = extractName(input[0]) catch return false;
//     return true;
// }

pub fn deinit(self: Tag) void {
    Attribute.deinitAll(self.allocator, self.attributes);
    for (self.contents) |element| element.deinit();
    self.allocator.free(self.contents);
}

pub fn render(self: Tag, result: *ArrayList(u8)) !void {
    try result.append('<');
    try result.appendSlice(self.name);
    try Attribute.renderAll(self.attributes, result);
    try result.append('>');
    if (self.is_void) return;
    for (self.contents) |element| try element.render(result);
    try result.appendSlice("</");
    try result.appendSlice(self.name);
    try result.append('>');
}

pub fn extractName(start_tag: []const u8) ![]const u8 {
    if (start_tag.len < 3 or
        start_tag[0] != '<' or
        start_tag[start_tag.len - 1] != '>') return error.HtmlParseError;
    const name = start_tag[1 .. start_tag.len - 1];
    if (!isValidName(name)) return error.HtmlParseError;
    return name;
}

pub fn isValidName(name: []const u8) bool {
    // Should have at least one character
    if (name.len == 0) return false;
    // First character must be a letter, underscore, or colon
    if (!std.ascii.isAlphabetic(name[0]) and
        name[0] != '_' and
        name[0] != ':') return false;
    // Rest can be letters, digits, hyphens, underscores, colons, or periods
    for (name[1..]) |ch| {
        if (!std.ascii.isAlphanumeric(ch) and
            ch != '-' and
            ch != '_' and
            ch != ':' and
            ch != '.') return false;
    }
    return true;
}

pub fn matchEndTag(name: []const u8, end_tag: []const u8) bool {
    return (end_tag.len > 3 and
        end_tag[0] == '<' and
        end_tag[1] == '/' and
        end_tag[end_tag.len - 1] == '>' and
        mem.eql(u8, name, end_tag[2 .. end_tag.len - 1]));
}

const testing = std.testing;
const expect = testing.expect;
const expectEqualDeep = testing.expectEqualDeep;
const expectEqualStrings = testing.expectEqualStrings;
const expectError = testing.expectError;

test init {
    const alloc = testing.allocator;

    // Void tag with no attributes = 1 element
    const tag1 = try init(alloc, .{"<br>"});
    defer tag1.deinit();
    const expected1 = Tag{ .name = "br", .is_void = true, .allocator = alloc };
    try expectEqualDeep(expected1, tag1);

    // Non-void tag without attributes or children - 2 elements
    const tag2 = try init(alloc, .{ "<div>", "</div>" });
    defer tag2.deinit();
    const expected2 = Tag{ .name = "div", .allocator = alloc };
    try expectEqualDeep(expected2, tag2);

    // Void tag with empty attributes - 2 elements
    const tag3 = try init(alloc, .{ "<br>", .{} });
    defer tag3.deinit();
    const expected3 = Tag{ .name = "br", .is_void = true, .allocator = alloc };
    try expectEqualDeep(expected3, tag3);

    // Void tag with attributes - 2 elements
    const raw_attrs4 = .{ .class = "container", .style = "margin-top:10px;" };
    const attributes4 = try Attribute.initAll(alloc, raw_attrs4);
    defer Attribute.deinitAll(alloc, attributes4);
    const tag4 = try init(alloc, .{ "<br>", raw_attrs4 });
    defer tag4.deinit();
    const expected4 = Tag{
        .name = "br",
        .is_void = true,
        .attributes = attributes4,
        .allocator = alloc,
    };
    try expectEqualDeep(expected4, tag4);

    // Non-void tag with attributes - 3 elements
    const raw_attrs5 = .{ .class = "container", .style = "margin-top:10px;" };
    const attributes5 = try Attribute.initAll(alloc, raw_attrs5);
    defer Attribute.deinitAll(alloc, attributes5);
    const tag5 = try init(alloc, .{ "<div>", raw_attrs5, "</div>" });
    defer tag5.deinit();
    const expected5 = Tag{
        .name = "div",
        .attributes = attributes5,
        .allocator = alloc,
    };
    try expectEqualDeep(expected5, tag5);

    // Non-void tag with contents - 3 elements
    const raw_attrs6 = .{ .class = "container", .style = "margin-top:10px;" };
    const attributes6 = try Attribute.initAll(alloc, raw_attrs6);
    defer Attribute.deinitAll(alloc, attributes6);
    const tag6 = try init(alloc, .{ "<div>", "Hello, world", "</div>" });
    defer tag6.deinit();
    const expected6 = Tag{
        .name = "div",
        .contents = &.{Element{ .text = "Hello, world" }},
        .allocator = alloc,
    };
    try expectEqualDeep(expected6, tag6);

    // Non-void tag with attribute and contents - 4 elements
    const raw_attrs7 = .{ .class = "container", .style = "margin-top:10px;" };
    const attributes7 = try Attribute.initAll(alloc, raw_attrs7);
    defer Attribute.deinitAll(alloc, attributes7);
    const tag7 = try init(alloc, .{ "<div>", raw_attrs7, "Hello, world", "</div>" });
    defer tag7.deinit();
    const expected7 = Tag{
        .name = "div",
        .attributes = attributes7,
        .contents = &.{Element{ .text = "Hello, world" }},
        .allocator = alloc,
    };
    try expectEqualDeep(expected7, tag7);

    // Error for invalid start tag
    const err = error.HtmlParseError;
    try expectError(err, init(alloc, .{"<br"}));
    try expectError(err, init(alloc, .{"br>"}));
    try expectError(err, init(alloc, .{"br>"}));

    // Error for non-matching end tag
    const raw_attrs8 = .{ .class = "container", .style = "margin-top:10px;" };
    const attributes8 = try Attribute.initAll(alloc, raw_attrs8);
    defer Attribute.deinitAll(alloc, attributes8);
    try expectError(err, init(alloc,.{"<div>", "</span>"}));
    try expectError(err, init(alloc,.{"<div>", raw_attrs8, "</span>"}));
    try expectError(err, init(alloc,.{"<div>", raw_attrs8, "Hello, wold", "</span>"}));

    // Error for invalid tag name
    try expectError(err, init(alloc, .{"< br>"}));
    try expectError(err, init(alloc, .{"<br >"}));
    try expectError(err, init(alloc, .{"<br/>"}));
    try expectError(err, init(alloc, .{"<1br>"}));
    try expectError(err, init(alloc, .{"<br$>"}));
}

test isValidName {
    // Valid tag names
    try expect(isValidName("a"));
    try expect(isValidName("A"));
    try expect(isValidName("_tag"));
    try expect(isValidName(":namespace"));
    try expect(isValidName("valid-name"));
    try expect(isValidName("valid_name"));
    try expect(isValidName("valid123"));
    try expect(isValidName("valid.tag"));

    // Invalid tag names
    try expect(!isValidName(""));
    try expect(!isValidName("1invalid"));
    try expect(!isValidName("-invalid"));
    try expect(!isValidName(".invalid"));
    try expect(!isValidName("invalid tag"));
    try expect(!isValidName("invalid@char"));
    try expect(!isValidName("invalid#tag"));

    // Invalid tag names with whitespace
    try expect(!isValidName("invalid tag")); // space in between
    try expect(!isValidName(" invalid")); // leading space
    try expect(!isValidName("invalid ")); // trailing space
    try expect(!isValidName("invalid\ttag")); // tab character
    try expect(!isValidName("invalid\ntag")); // newline character

}

test matchEndTag {
    try expect(matchEndTag("div", "</div>") == true); // Correct match
    try expect(matchEndTag("span", "</div>") == false); // Incorrect tag name
    try expect(matchEndTag("div", "<div>") == false); // Missing slash
    try expect(matchEndTag("div", "</div") == false); // Tag not properly closed
    try expect(matchEndTag("", "</>") == false); // Too short tag
    try expect(matchEndTag("a", "</a>") == true); // Single character tag
}

test extractName {
    // Valid cases
    try expectEqualStrings("div", try extractName("<div>"));
    try expectEqualStrings("a", try extractName("<a>"));
    try expectEqualStrings("custom-tag", try extractName("<custom-tag>"));

    const err = error.HtmlParseError;
    try expectError(err, extractName("div"));
    try expectError(err, extractName("div>"));
    try expectError(err, extractName("<div"));
    try expectError(err, extractName("<>"));
    try expectError(err, extractName("<123div>"));
}

