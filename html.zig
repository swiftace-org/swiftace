const std = @import("std");
const util = @import("util.zig");
const mem = std.mem;
const Allocator = mem.Allocator;

// TODOS
// - [ ] For self closing tag, check that opening tag ends with "/>"
// - [ ] Sanitize any text children (or should it be done while rendering?)
// - [ ] Sanitize attribute values (or should it be done while rendering?)
// - [ ] Create a separate function for string sanitization
// - [ ] Add errdefer
// - [ ] Improve error message in the case of custom component

const Element = union(enum) {
    nil: void,
    raw: []const u8,
    tag: Tag,

    pub fn init(allocator: Allocator, input: anytype) !Element {
        const input_type = @TypeOf(input);
        const info = @typeInfo(input_type);
        if (input_type == Element) return input;
        if (input_type == Tag) return .{ .tag = input };
        if (input_type == void) return .nil;
        if (comptime util.isZigString(input_type)) return .{ .raw = input };
        if (info == .Null) return .nil;
        if (info == .Struct) {
            const fields = info.Struct.fields;
            if (fields.len == 0) return .nil;
            if (info.Struct.is_tuple) return .{ .tag = try Tag.init(allocator, input) }; // tested
            return input.build(allocator);
        }
        @compileError("Invalid input received: " ++ @typeName(input_type));
    }

    pub fn deinit(self: Element, allocator: Allocator) void {
        if (self == .tag) self.tag.deinit(allocator);
    }
};

const Tag = struct {
    name: []const u8,
    is_void: bool = false,
    attributes: []const Attribute = &.{},
    contents: []const Element = &.{},

    pub fn init(allocator: Allocator, input: anytype) !Tag {
        const input_type: type = @TypeOf(input);
        const info = @typeInfo(input_type);
        if (info != .Struct or !info.Struct.is_tuple) @compileError("Expected tuple. Received: " ++ @typeName(input_type));
        if (input.len == 0 or input.len > 4) @compileError("Expected 1 to 4 fields. Received: " ++ input.len);
        if (comptime !util.isZigString(@TypeOf(input[0]))) @compileError("Expect string start tag. Received: " ++ @typeName(@TypeOf(input[0])));

        const name = try extractTagName(input[0]);

        // Void tag without attributes
        if (input.len == 1) return .{ .name = name, .is_void = true };

        // Void tag with attributes
        if (input.len == 2) {
            if (comptime util.isZigString(@TypeOf(input[1]))) {
                if (!matchEndTag(name, input[1])) return error.HtmlParseError;
                return .{ .name = name };
            }
            const attributes = try Attribute.initAll(allocator, input[1]);
            return .{ .name = name, .is_void = true, .attributes = attributes };
        }

        // Non-void tag with either attributes or contents, but not both
        if (input.len == 3) {
            if (!matchEndTag(name, input[2])) return error.HtmlParseError;

            const body_info = @typeInfo(@TypeOf(input[1]));
            if (body_info == .Struct and body_info.Struct.fields.len > 0 and !body_info.Struct.is_tuple) {
                const attributes = try Attribute.initAll(allocator, input[1]);
                return .{ .name = name, .attributes = attributes };
            }

            const contents = try parseContents(allocator, input[1]);
            return .{ .name = name, .contents = contents };
        }

        // Non-void tag with attributes and contents
        if (!matchEndTag(name, input[3])) return error.HtmlParseError;
        const attributes = try Attribute.initAll(allocator, input[1]);
        const contents = try parseContents(allocator, input[2]);
        return .{ .name = name, .attributes = attributes, .contents = contents };
    }

    pub fn deinit(self: Tag, allocator: Allocator) void {
        allocator.free(self.attributes);
        for (self.contents) |element| element.deinit(allocator);
        allocator.free(self.contents);
    }

    pub fn parseContents(allocator: Allocator, inputs: anytype) ![]const Element {
        const input_type: type = @TypeOf(inputs);
        const info = @typeInfo(input_type);

        if (comptime util.isZigString(input_type)) {
            const elements = try allocator.alloc(Element, 1);
            elements[0] = Element.init(inputs);
            return elements;
        }

        const elements = try allocator.alloc(Element, inputs.len);
        if (info == .Struct and info.Struct.is_tuple) {
            inline for (inputs, 0..) |input, i| elements[i] = try Element.init(allocator, input);
        } else {
            for (inputs, 0..) |input, i| elements[i] = try Element.init(allocator, input);
        }
        return elements;
    }

    pub fn extractTagName(input: []const u8) ![]const u8 {
        if (input.len < 3 or input[0] != '<' or input[input.len - 1] != '>') return error.HtmlParseError;
        const tag_name = input[1 .. input.len - 1];
        if (!isValidTagName(tag_name)) return error.HtmlParseError;
        return tag_name;
    }

    pub fn isValidTagName(name: []const u8) bool {
        // Tag name should have at least one character
        if (name.len == 0) return false;
        // First character must be a letter, underscore, or colon (avoid colon if possible)
        if (!std.ascii.isAlphabetic(name[0]) and
            name[0] != '_' and
            name[0] != ':'
        ) return false;
        // Subsequent characters can be letters, digits, hyphens, underscores, colons, or periods
        for (name[1..]) |ch| {
            if (!std.ascii.isAlphanumeric(ch) and
                ch != '-' and
                ch != '_' and
                ch != ':' and
                ch != '.'
            ) return false;
        }
        return true;
    }

    pub fn matchEndTag(name: []const u8, end_tag: []const u8) bool {
        return (end_tag.len < 4 or
            end_tag[0] != '<' or
            end_tag[1] != '/' or
            end_tag[end_tag.len - 1] != '>' or
            mem.eql(u8, name, end_tag[2 .. end_tag.len - 1]));
    }
};

const Attribute = struct {
    name: []const u8,
    value: ?[]const u8,

    pub fn initAll(allocator: Allocator, input: anytype) ![]const Attribute {
        const input_type: type = @TypeOf(input);
        const info = @typeInfo(input_type);
        if (info != .Struct) @compileError("Expected a struct. Received: " ++ @typeName(input_type));

        const fields = info.Struct.fields;
        if (fields.len == 0) return &.{};
        if (info.Struct.is_tuple) @compileError("Expected a non-tuple struct. Received: " ++ @typeName(input_type));

        var attributes = try allocator.alloc(Attribute, fields.len);
        inline for (fields, 0..) |field, i| {
            attributes[i] = Attribute{
                .name = field.name,
                .value = @field(input, field.name),
            };
        }
        return attributes;
    }
};

const testing = std.testing;
const expect = testing.expect;
const expectEqualStrings = testing.expectEqualStrings;
const expectEqualDeep = testing.expectEqualDeep;

test "Element.init creates a nil element for void{}" {
    const el1 = try Element.init(testing.allocator, {});
    try expect(el1 == .nil);
}

test "Element.init create a nil element for null" {
    const el2 = try Element.init(testing.allocator, null);
    try expect(el2 == .nil);
}

test "Element.init creates a nil element for an empty tuple/struct" {
    const el3 = try Element.init(testing.allocator, .{});
    try testing.expect(el3 == .nil);
}

test "Element.init creates a raw element with strings" {
    const el1 = try Element.init(testing.allocator, "");
    try expect(el1 == .raw);
    try expectEqualStrings(el1.raw, "");

    const el2: Element = try Element.init(testing.allocator, "Hello, world");
    try expect(el2 == .raw);
    try expectEqualStrings(el2.raw, "Hello, world");

    const raw_html =
        \\<html lang="en">
        \\<head>
        \\    <meta charset="UTF-8">
        \\    <meta name="viewport" content="width=device-width, initial-scale=1.0">
        \\    <title>Hello, World!</title>
        \\</head>
        \\<body>
        \\    <h1>Hello, World!</h1>
        \\</body>
        \\</html>
    ;
    const el3 = try Element.init(testing.allocator, raw_html);
    try expect(el3 == .raw);
    try expectEqualStrings(el3.raw, raw_html);
}

test "Element.init returns back an existing element passed as input" {
    const input = Element{ .raw = "Hello, world" };
    const el1 = try Element.init(testing.allocator, input);
    try expectEqualDeep(input, el1);
}

test "Element.init wraps an existing tag in an element" {
    const tag1 = Tag{ 
        .name = "span", 
        .attributes = &.{
            Attribute{ .name = "class", .value = "normal-text" }
        }, 
        .contents = &.{
            Element{ .raw = "Hello, world" }
        } 
    };

    const el1 = Element.init(testing.allocator, tag1);
    try expectEqualDeep(Element{ .tag = tag1 }, el1);
}

test "Element.init parses a tuple as a tag" {
    const el1 = try Element.init(
        testing.allocator, 
        .{ "<div>", .{"Hello, world"}, "</div>" }
    );
    defer el1.deinit(testing.allocator);
    try testing.expect(el1 == .tag);
}

const MyList = struct {
    item: []const u8,

    pub fn build(self: @This(), allocator: Allocator) !Element {
        return Element.init(allocator, .{ "<ul>", .{
            .{ "<li>", .{self.item}, "</li>" },
        }, "</ul>" });
    }
};

test "Element.init parses a non-tuple struct as a component" {
    const el1 = try Element.init(testing.allocator, MyList{ .item = "Hello, world" });
    const expected = try Element.init(testing.allocator, .{ "<ul>", .{}, .{
        .{ "<li>", .{"Hello, world"}, "</li>" },
    }, "</ul>" });
    defer el1.deinit(testing.allocator);
    defer expected.deinit(testing.allocator);
    try testing.expectEqualDeep(expected, el1);
}

test "Tag.init parses a void tag with no attributes" {
    const tag1 = try Tag.init(testing.allocator, .{"<br>"});
    defer tag1.deinit(testing.allocator);
    const expected = Tag{ .name = "br", .is_void = true };
    try testing.expectEqualDeep(expected, tag1);
}

test "Tag.init parses non-void tag without attributes or children" {
    const tag1 = try Tag.init(testing.allocator, .{ "<div>", "</div>" });
    defer tag1.deinit(testing.allocator);
    const expected = Tag{ .name = "div" };
    try testing.expectEqualDeep(expected, tag1);
}

test "Tag.init parses a void tag with attributes" {
    const tag1 = try Tag.init(testing.allocator, .{ "<br>", .{} });
    defer tag1.deinit(testing.allocator);
    const expected1 = Tag{ .name = "br", .is_void = true };
    try testing.expectEqualDeep(expected1, tag1);

    const tag2 = try Tag.init(testing.allocator, .{ "<br>", .{ .class = "container", .style = "margin-top:10px;" } });
    defer tag2.deinit(testing.allocator);
    const attributes: []const Attribute = &.{ .{ .name = "class", .value = "container" }, .{ .name = "style", .value = "margin-top:10px;" } };
    const expected2 = Tag{ .name = "br", .is_void = true, .attributes = attributes };
    try testing.expectEqualDeep(expected2, tag2);
}

test "Tag.init returns an error if start tag doesn't begin with '<' or end with '>'" {
    const alloc = testing.allocator;
    try testing.expectError(error.HtmlParseError, Element.init(alloc, .{"<br"}));
    try testing.expectError(error.HtmlParseError, Element.init(alloc, .{"br>"}));
    try testing.expectError(error.HtmlParseError, Element.init(alloc, .{"br>"}));
}

test "Tag.init returns an error if start tag doesn't have a valid name" {
    const alloc = testing.allocator;
    const expectError = testing.expectError;
    const err = error.HtmlParseError;
    try expectError(err, Tag.init(alloc, .{"< br >"}));
    try expectError(err, Tag.init(alloc, .{"<br >"}));
    try expectError(err, Tag.init(alloc, .{"< br>"}));
    try expectError(err, Tag.init(alloc, .{"<1>"}));
    try expectError(err, Tag.init(alloc, .{"<2$>"}));
}

test "Attribute.initAll parses empty tuples" {
    const attr1 = try Attribute.initAll(testing.allocator, .{});
    const expected = &.{};
    try testing.expectEqualDeep(expected, attr1);
}

test "Attribute.initAll parses a non-tuple struct" {
    const input1 = .{ .class = "container", .style = "margin-top:10px;" };
    const attrs1 = try Attribute.initAll(testing.allocator, input1);
    defer testing.allocator.free(attrs1);
    const expected1: []const Attribute = &.{
        .{ .name = "class", .value = "container" },
        .{ .name = "style", .value = "margin-top:10px;" },
    };
    try testing.expectEqualDeep(expected1, attrs1);
}

test "Tag.isValidTagName" {

    // Valid tag names
    try std.testing.expect(Tag.isValidTagName("a"));
    try std.testing.expect(Tag.isValidTagName("A"));
    try std.testing.expect(Tag.isValidTagName("_tag"));
    try std.testing.expect(Tag.isValidTagName(":namespace"));
    try std.testing.expect(Tag.isValidTagName("valid-name"));
    try std.testing.expect(Tag.isValidTagName("valid_name"));
    try std.testing.expect(Tag.isValidTagName("valid123"));
    try std.testing.expect(Tag.isValidTagName("valid.tag"));

    // Invalid tag names
    try std.testing.expect(!Tag.isValidTagName(""));
    try std.testing.expect(!Tag.isValidTagName("1invalid"));
    try std.testing.expect(!Tag.isValidTagName("-invalid"));
    try std.testing.expect(!Tag.isValidTagName(".invalid"));
    try std.testing.expect(!Tag.isValidTagName("invalid tag"));
    try std.testing.expect(!Tag.isValidTagName("invalid@char"));
    try std.testing.expect(!Tag.isValidTagName("invalid#tag"));

    // Invalid tag names with whitespace
    try std.testing.expect(!Tag.isValidTagName("invalid tag")); // space in between
    try std.testing.expect(!Tag.isValidTagName(" invalid")); // leading space
    try std.testing.expect(!Tag.isValidTagName("invalid ")); // trailing space
    try std.testing.expect(!Tag.isValidTagName("invalid\ttag")); // tab character
    try std.testing.expect(!Tag.isValidTagName("invalid\ntag")); // newline character

}
