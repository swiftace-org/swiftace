const std = @import("std");
const mem = std.mem;

// TODOS
// - [ ] Compile error should indicate exactly where the error is
// - [ ] In tag checking, make sure to check if there's at least one character.

const Element = struct {
    opening_tag: []const u8,
    attributes: ?Attributes = null,
    children: ?Children = null,
    closing_tag: ?[]const u8 = null,
    allocator: mem.Allocator,

    pub const Attributes = std.StringHashMap([]const u8);

    pub const Children = union (enum) {
        text: []const u8,
        elements: []Element,
    };

    pub fn init(allocator: mem.Allocator, input: anytype) error{OutOfMemory,HtmlParseError}!Element {
        const info = @typeInfo(@TypeOf(input));
        if (!info.Struct.is_tuple or info.Struct.fields.len != 4) @compileError("Expected a tuple containing 4 elements");

        const opening_tag: []const u8 = input[0];
        if (!isValidOpeningTag(opening_tag)) {
            std.log.err("Invalid opening tag: \"{s}\"\n", .{opening_tag});
            return error.HtmlParseError;
        }

        const closing_tag_opt: ?[]const u8 = input[3];
        if (closing_tag_opt) |closing_tag| {
                if (!isValidClosingTag(closing_tag)) {
                std.log.err("Invalid closing tag: \"{s}\"", .{closing_tag});
                return error.HtmlParseError;
            }

            if (!mem.eql(u8, opening_tag[1..opening_tag.len-1], closing_tag[2..closing_tag.len-1])) {
                std.log.err("Opening tag \"{s}\" and closing tag \"{s}\" do not match", .{opening_tag, closing_tag});
                return error.HtmlParseError;
            }
        }

        const attributes: ?Attributes = try parseAttributes(input[1], allocator);
        
        return Element{ 
            .opening_tag = opening_tag, 
            .closing_tag = closing_tag_opt,
            .attributes = attributes,
            .allocator = allocator,
        };
    }

    pub fn deinit(self: Element) void {
        if (self.attributes) |attributes| {
            // TODO - call deinit only if attributes used the same allocator
            Attributes.deinit(@constCast(&attributes));
        }
    }

    pub fn parseAttributes(raw_attributes: anytype, allocator: mem.Allocator) error{OutOfMemory,HtmlParseError}!?Attributes {
        switch(@typeInfo(@TypeOf(raw_attributes))) {
            .Struct => |attr_info| {
                if (attr_info.fields.len == 0) return null;
                var attributes = Attributes.init(allocator);
                inline for (attr_info.fields) |field| {
                    const value: []const u8 = @field(raw_attributes, field.name);
                    try attributes.put(field.name, value);
                }
                return attributes;
            },
            else => {
                std.log.err("Attributes must be an anonymous struct of string key-value pairs");
                return error.HtmlParseError;
            }
        }    
    }

    pub fn parseChildren(raw_children: anytype) !?Children {
        switch(@typeInfo(@TypeOf(raw_children))) {
            .Pointer => {},
            .Struct => {},
            else => {
                std.log.err("Children must be a string or a tuple of elements");
                return error.HtmlParseError;

            },
        }
    }

    pub inline fn isValidOpeningTag(tag: []const u8) bool {
        return tag.len > 2 and tag[0] == '<' and tag[tag.len - 1] == '>' and isValidTagName(tag[1..tag.len-1]);
    }

    pub inline fn isValidClosingTag(tag: []const u8) bool {
        return tag.len > 3 and tag[0] == '<' and tag[1] == '/' and tag[tag.len - 1] == '>' and isValidTagName(tag[2..tag.len-1]);
    }

    pub fn isValidTagName(name: []const u8) bool {
        if (name.len == 0) return false;

        // First character must be a letter, underscore, or colon (avoid colon if possible)
        if (!std.ascii.isAlphabetic(name[0]) and name[0] != '_' and name[0] == ':') return false;

        // Subsequent characters can be letters, digits, hyphens, underscores, colons, or periods
        for (name[1..]) |ch| {
            if (!(std.ascii.isAlphanumeric(ch) or (ch == '-') or (ch == '_') or (ch == ':') or (ch == '.'))) return false;
        }

        return true;
    }

    
};

const testing = std.testing;

test "parse an element without attributes or children" {
    var opening_tag = "<div>";
    _ = &opening_tag;
    const input = .{opening_tag, .{}, .{}, "</div>"};
    const actual = try Element.init(std.testing.allocator, input);
    defer actual.deinit();
    try testing.expectEqualStrings("<div>", actual.opening_tag);
    try testing.expectEqualStrings("</div>", actual.closing_tag.?);
}

test "parse an element with attributes but no children" {
    var opening_tag = "<div>";
    _ = &opening_tag;
    const input = .{opening_tag, .{ .class = "container", .style = "margin-top: 10px;" }, .{}, "</div>"};
    const actual = try Element.init(std.testing.allocator, input);
    defer actual.deinit();
    try testing.expectEqualStrings("<div>", actual.opening_tag);
    try testing.expectEqualStrings("</div>", actual.closing_tag.?);
    try testing.expectEqualStrings("container", actual.attributes.?.get("class").?);
    try testing.expectEqualStrings("margin-top: 10px;", actual.attributes.?.get("style").?);
}