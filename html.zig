const std = @import("std");
const util = @import("./html/util.zig");
const Attribute = @import("./html/Attribute.zig");
const Tag = @import("./html/Tag.zig");
const mem = std.mem;
const meta = std.meta;
const Allocator = mem.Allocator;
const ArrayList = std.ArrayList;

// TODO
// - [no] For self closing tag, check that opening tag ends with "/>"
// - [ ] Sanitize any text children (or should it be done while rendering?)
// - [ ] Sanitize attribute values (or should it be done while rendering?)
// - [ ] Create a separate function for string sanitization
// - [ ] Add errdefer (?)
// - [ ] Improve error message in the case of custom component
// - [ ] Handle duplicate attribute names
// - [ ] Add some recursiion safety (?)
// - [ ] Solve the problem of deallocation in components

pub const Element = union(enum) {
    /// Nothing (does not render)
    nil: void,
    /// HTML tag with attributes and/or contents
    tag: Tag,
    /// Non-HTML plain text (&,<,>,",' escaped for rendering)
    text: []const u8,
    /// Raw HTML rendered as-is without escaping (use with caution)
    raw: []const u8,

    const nil: Element = .nil;

    pub fn init(allocator: Allocator, input: anytype) !Element {
        const input_type = @TypeOf(input);
        const info = @typeInfo(input_type);
        
        if (input_type == void) return .nil;
        if (info == .Null) return .nil;
        
        if (input_type == Element) return input;
        if (input_type == Tag) return .{ .tag = input };
        if (comptime util.isZigString(input_type)) return .{ .text = input };
        
        if (info == .Struct and info.Struct.is_tuple) {
            const fields = info.Struct.fields;
            if (fields.len == 0) return .nil;
            const start_type = @TypeOf(input[0]);
            if (start_type == type) return buildComponent(allocator, input);
            return .{ .tag = try Tag.init(allocator, input) };
        }
        @compileError("Invalid input received: " ++ @typeName(input_type));
    }

    pub fn deinit(self: Element) void {
        if (self == .tag) self.tag.deinit();
    }


    pub fn render(self: Element, result: *ArrayList(u8)) Allocator.Error!void {
        switch (self) {
            .nil => {},
            .text => |text| {
                for (text) |char| {
                    switch (char) {
                        '&' => try result.appendSlice("&amp;"),
                        '<' => try result.appendSlice("&lt;"),
                        '>' => try result.appendSlice("&gt;"),
                        '"' => try result.appendSlice("&quot;"),
                        '\'' => try result.appendSlice("&#39;"),
                        else => try result.append(char),
                    }
                }
            },
            .raw => |raw| try result.appendSlice(raw),
            .tag => |tag| try tag.render(result),
        }
    }

    fn buildComponent(allocator: Allocator, input: anytype) !Element {
        if (input.len == 1) return try input[0].build(allocator);
        if (input.len == 2) return try input[0].build(allocator, input[1]);
        if (input.len == 3) return try input[0].build(allocator, input[1], input[2]);
        @compileError("Component type must have a valid build function. Received: " ++ @typeName(input[0]));
    }
};

const testing = std.testing;
const expect = testing.expect;
const expectEqualStrings = testing.expectEqualStrings;
const expectEqualDeep = testing.expectEqualDeep;

test "Element.init returns .nil for empty inputs" {
    const alloc = testing.allocator;
    try expect(try Element.init(alloc, {}) == .nil);
    try expect(try Element.init(alloc, null) == .nil);
    try expect(try Element.init(alloc, Element.nil) == .nil);
    try expect(try Element.init(alloc, .{}) == .nil);
}

test "Element.init returns an existing element as is" {
    const alloc = testing.allocator;
    const expected1 = Element{ .text = "Hello, world" };
    const actual1 = try Element.init(alloc, expected1);
    defer actual1.deinit();
    try expectEqualDeep(expected1, actual1);
}

test "Element.init wraps a tag into Element.tag" {
    const alloc = testing.allocator;
    const input3 = Tag{ .name = "br", .allocator = alloc };
    const expected3 = Element{ .tag = input3 };
    const actual3 = try Element.init(alloc, input3);
    defer actual3.deinit();
    try expectEqualDeep(expected3, actual3);
}

test "Element.init wraps a string into Element.text" {
    const alloc = testing.allocator; 

    const input4 = "Hello, world";
    const expected4 = Element{ .text = input4 };
    const actual4 = try Element.init(alloc, input4);
    defer actual4.deinit();
    try expectEqualDeep(expected4, actual4);    
}

test "Element.init builds a component when a custom type is detected" {
    const alloc = testing.allocator;
    const BoldText = struct {
        pub fn build(allocator: Allocator, contents: anytype) !Element {
            return try Element.init(allocator, .{"<b>", contents, "</b>"});
        }
    };
    const expected5 = try Element.init(alloc, .{"<b>", "Hello, world", "</b>"});
    const actual5 = try Element.init(alloc, .{ BoldText, "Hello, world"});
    defer actual5.deinit();
    defer expected5.deinit();
    try expectEqualDeep(expected5, actual5);
}

test "Element.init parses a tuple representing a tag (if first element is a string)" {
    const alloc = testing.allocator;
    const input6 = .{ "<div>", .{ .class = "container" }, "Hello, world", "</div>"};
    const expected6: Element = .{ .tag = .{
        .name = "div",
        .attributes = &.{ .{ .name = "class", .value = .{ .text = "container"}}},
        .contents = &.{.{ .text = "Hello, world" }},
        .allocator = alloc,
    } };
    const actual6 = try Element.init(alloc, input6);
    try expectEqualDeep(expected6, actual6);
    defer actual6.deinit();
}


fn expectElementRender(alloc: Allocator, expected: []const u8, input: anytype) !void {
    const element = try Element.init(alloc, input);
    defer element.deinit();
    var actual = ArrayList(u8).init(alloc);
    defer actual.deinit();
    try element.render(&actual);
    try expectEqualStrings(expected, actual.items);
}

test "Element.render" {
    const alloc = testing.allocator;

    // Nil
    try expectElementRender(alloc, "", {});
    
    // Text without special characters
    const input2 = "Hello, world";
    const expected2 = "Hello, world";
    try expectElementRender(alloc, expected2, input2);

    // Text with special characters
    const input3 = "a < b & c > d \"quote\" 'apostrophe'";
    const expected3 = "a &lt; b &amp; c &gt; d &quot;quote&quot; &#39;apostrophe&#39;";
    try expectElementRender(alloc, expected3, input3);

    // Raw with special characters
    const input4: Element = .{ .raw = "a < b & c > d \"quote\" 'apostrophe'" };
    const expected4 = "a < b & c > d \"quote\" 'apostrophe'";
    try expectElementRender(alloc, expected4, input4);

    // Tag with attributes and contents
    const input5 = .{ 
        "<div>", .{ .class = "container", .style = "margin-top:10px;" }, .{
            .{"<span>", .{ .class = "text" }, "Hello, world", "</span>"}
        }, 
        "</div>" 
    };
    const expected5 = "<div class=\"container\" style=\"margin-top:10px;\">" ++ 
        "<span class=\"text\">Hello, world</span></div>";
    try expectElementRender(alloc, expected5, input5);
}


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
