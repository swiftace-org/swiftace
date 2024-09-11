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
            if (@typeInfo(start_type) == .Struct) return try buildComponent(allocator, input);
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
        const contents = Element.init(allocator, input[1]);
        if (input.len == 2) return try input[0].build(allocator, contents);
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

test "Element.init parses a non-tuple struct as a component" {
    const MyList = struct {
        items: []const []const u8,

        pub fn build(self: @This(), allocator: Allocator) !Element {
            const list_items = try allocator.alloc(Element, self.items.len);
            for (self.items, 0..) |item, i| {
                list_items[i] = try Element.init(allocator, 
                    .{ "<li>", .{item}, "</li>" }
                );
            }
            return try Element.init(allocator, .{ "<ul>", list_items, "</ul>" });
        }
    };

    // const RootLayout = struct {};
    // const MainNav = struct {};

    const el1 = try Element.init(testing.allocator,
        .{"<html>", .{
            .{"<head>", .{
                .{ "<title>", "Page Title", "</title>" },
            }, "</head>"},
            .{"<body>", .{
                .{ "<h1>", "Page Heading", "</h1>" },
                .{ MyList{ .items = &.{"Hello, world", "Hello, aliens"} } },
                // .{ "<", RootLayout{ .title = "Jovian " }, .{
                //     .{"<", MainNav{ .favicon = "/favicon.png" }, "/>" },
                // }, "/>" }
            }, "</body>"},
        }, "</html>"}
    );
    const expected = try Element.init(testing.allocator, 
        .{"<html>", .{
            .{"<head>", .{
                .{ "<title>", "Page Title", "</title>" },
            }, "</head>"},
            .{"<body>", .{
                .{ "<h1>", "Page Heading", "</h1>" },
                .{ "<ul>", .{
                    .{ "<li>", "Hello, world", "</li>" },
                    .{ "<li>", "Hello, aliens", "</li>" },
                }, "</ul>"},
            }, "</body>"},
        }, "</html>"}
    );
    defer el1.deinit();
    defer expected.deinit();
    try testing.expectEqualDeep(expected, el1);
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

    
    const MyList = struct {
        items: []const []const u8,

        pub fn build(self: @This(), allocator: Allocator) !Element {
            const list_items = try allocator.alloc(Element, self.items.len);
            for (self.items, 0..) |item, i| {
                list_items[i] = try Element.init(allocator, 
                    .{ "<li>", .{item}, "</li>" }
                );
            }
            return try Element.init(allocator, .{ "<ul>", list_items, "</ul>" });
        }
    };

    // Deeply nested element with custom component
    const input6 = .{"<html>", .{
        .{"<head>", .{
            .{ "<title>", "Page Title", "</title>" },
        }, "</head>"},
        .{"<body>", .{
            .{ "<h1>", "Page Heading", "</h1>" },
            .{ MyList{ .items = &.{"Hello, world", "Hello, aliens"} } },
        }, "</body>"},
    }, "</html>" };
    const expected6 = "<html><head><title>Page Title</title></head>" ++ 
        "<body><h1>Page Heading</h1><ul><li>Hello, world</li>" ++ 
        "<li>Hello, aliens</li></ul></body></html>";
    try expectElementRender(alloc, expected6, input6);

}






