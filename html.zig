const std = @import("std");
const util = @import("./html/util.zig");
const Attribute = @import("./html/Attribute.zig");
const Tag = @import("./html/Tag.zig");
const mem = std.mem;
const Allocator = mem.Allocator;
const ArrayList = std.ArrayList;

comptime {
    _ = @import("./html/Tag.zig");
}

// TODOS
// - [ ] For self closing tag, check that opening tag ends with "/>"
// - [ ] Sanitize any text children (or should it be done while rendering?)
// - [ ] Sanitize attribute values (or should it be done while rendering?)
// - [ ] Create a separate function for string sanitization
// - [ ] Add errdefer
// - [ ] Improve error message in the case of custom component

pub const Element = union(enum) {
    nil: void,
    raw: []const u8,
    tag: Tag,
    list: []Element,

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
            if (!info.Struct.is_tuple) return input.build(allocator);
            if (Tag.canInit(input)) return .{ .tag = try Tag.init(allocator, input) }; // tested

            const elements = allocator.alloc(Element, fields.len);
            inline for (0..fields.len) |i| elements[i] = try Element.init(allocator, input[i]);
            return elements;
        }
        @compileError("Invalid input received: " ++ @typeName(input_type));
    }

    pub fn deinit(self: Element) void {
        if (self == .tag) self.tag.deinit();
        if (self == .list) for (self.list) |element| element.deinit();
    }

    // pub fn initAll(allocator: Allocator, inputs: anytype) ![]const Element {
    //     const input_type: type = @TypeOf(inputs);
    //     const info = @typeInfo(input_type);

    //     if (comptime util.isZigString(input_type)) {
    //         const elements = try allocator.alloc(Element, 1);
    //         elements[0] = Element.init(inputs);
    //         return elements;
    //     }

    //     const elements = try allocator.alloc(Element, inputs.len);
    //     if (info == .Struct and info.Struct.is_tuple) {
    //         inline for (inputs, 0..) |input, i| elements[i] = try Element.init(allocator, input);
    //     } else {
    //         for (inputs, 0..) |input, i| elements[i] = try Element.init(allocator, input);
    //     }
    //     return elements;
    // }

    pub fn render(self: Element, result: *ArrayList(u8)) void {
        switch (self) {
            .raw => |raw| result.appendSlice(raw),
            .tag => |tag| tag.render(result),
            .nil => {},
            .list => |element| element.render(result),
        }
    }
};

// const testing = std.testing;
// const expect = testing.expect;
// const expectEqualStrings = testing.expectEqualStrings;
// const expectEqualDeep = testing.expectEqualDeep;

// test "Element.init creates a nil element for void{}" {
//     const el1 = try Element.init(testing.allocator, {});
//     try expect(el1 == .nil);
// }

// test "Element.init create a nil element for null" {
//     const el2 = try Element.init(testing.allocator, null);
//     try expect(el2 == .nil);
// }

// test "Element.init creates a nil element for an empty tuple/struct" {
//     const el3 = try Element.init(testing.allocator, .{});
//     try testing.expect(el3 == .nil);
// }

// test "Element.init creates a raw element with strings" {
//     const el1 = try Element.init(testing.allocator, "");
//     try expect(el1 == .raw);
//     try expectEqualStrings(el1.raw, "");

//     const el2: Element = try Element.init(testing.allocator, "Hello, world");
//     try expect(el2 == .raw);
//     try expectEqualStrings(el2.raw, "Hello, world");

//     const raw_html =
//         \\<html lang="en">
//         \\<head>
//         \\    <meta charset="UTF-8">
//         \\    <meta name="viewport" content="width=device-width, initial-scale=1.0">
//         \\    <title>Hello, World!</title>
//         \\</head>
//         \\<body>
//         \\    <h1>Hello, World!</h1>
//         \\</body>
//         \\</html>
//     ;
//     const el3 = try Element.init(testing.allocator, raw_html);
//     try expect(el3 == .raw);
//     try expectEqualStrings(el3.raw, raw_html);
// }

// test "Element.init returns back an existing element passed as input" {
//     const input = Element{ .raw = "Hello, world" };
//     const el1 = try Element.init(testing.allocator, input);
//     try expectEqualDeep(input, el1);
// }

// test "Element.init wraps an existing tag in an element" {
//     const tag1 = Tag{
//         .name = "span",
//         .attributes = &.{
//             Attribute{ .name = "class", .value = "normal-text" }
//         },
//         .contents = &.{
//             Element{ .raw = "Hello, world" }
//         }
//     };

//     const el1 = Element.init(testing.allocator, tag1);
//     try expectEqualDeep(Element{ .tag = tag1 }, el1);
// }

// test "Element.init parses a tuple as a tag" {
//     const el1 = try Element.init(
//         testing.allocator,
//         .{ "<div>", .{"Hello, world"}, "</div>" }
//     );
//     defer el1.deinit(testing.allocator);
//     try testing.expect(el1 == .tag);
// }

// const MyList = struct {
//     item: []const u8,

//     pub fn build(self: @This(), allocator: Allocator) !Element {
//         return Element.init(allocator, .{ "<ul>", .{
//             .{ "<li>", .{self.item}, "</li>" },
//         }, "</ul>" });
//     }
// };

// test "Element.init parses a non-tuple struct as a component" {
//     const el1 = try Element.init(testing.allocator, MyList{ .item = "Hello, world" });
//     const expected = try Element.init(testing.allocator, .{ "<ul>", .{}, .{
//         .{ "<li>", .{"Hello, world"}, "</li>" },
//     }, "</ul>" });
//     defer el1.deinit(testing.allocator);
//     defer expected.deinit(testing.allocator);
//     try testing.expectEqualDeep(expected, el1);
// }

// test "Tag.init parses a void tag with no attributes" {
//     const tag1 = try Tag.init(testing.allocator, .{"<br>"});
//     defer tag1.deinit(testing.allocator);
//     const expected = Tag{ .name = "br", .is_void = true };
//     try testing.expectEqualDeep(expected, tag1);
// }

// test "Tag.init returns an error if start tag doesn't begin with '<' or end with '>'" {
//     const alloc = testing.allocator;
//     try testing.expectError(error.HtmlParseError, Element.init(alloc, .{"<br"}));
//     try testing.expectError(error.HtmlParseError, Element.init(alloc, .{"br>"}));
//     try testing.expectError(error.HtmlParseError, Element.init(alloc, .{"br>"}));
// }

// test "Tag.init returns an error if start tag doesn't have a valid name" {
//     const alloc = testing.allocator;
//     const expectError = testing.expectError;
//     const err = error.HtmlParseError;
//     try expectError(err, Tag.init(alloc, .{"< br >"}));
//     try expectError(err, Tag.init(alloc, .{"<br >"}));
//     try expectError(err, Tag.init(alloc, .{"< br>"}));
//     try expectError(err, Tag.init(alloc, .{"<1>"}));
//     try expectError(err, Tag.init(alloc, .{"<2$>"}));
// }
