const std = @import("std");
const mem = std.mem;
const util = @import("./html/util.zig");
const Attribute = @import("./html/Attribute.zig");
const Tag = @import("./html/Tag.zig");
const ArrayList = std.ArrayList;
const Allocator = mem.Allocator;

pub const Element = union(enum) {
    nil: void,
    text: ArrayList(u8),
    raw: ArrayList(u8),
    tag: Tag,
    list: ArrayList(Element),

    const nil: Element = .nil;

    pub fn init(allocator: Allocator, input: anytype) !Element {
        const input_type = @TypeOf(input);
        if (input_type == void) return .nil;
        if (input_type == @TypeOf(null)) return .nil;
        if (input_type == Element) return input;
        if (comptime util.isZigString(input_type)) return .{ .text = input };
        
        const info = @typeInfo(input_type);
        const type_name = @typeName(input_type);
        if (info != .Struct or !info.Struct.is_tuple) @compileError("Expected tuple. Received: " ++ type_name);
        if (input.len == 0) return .nil;
        if (input.len == 1) return initOne(allocator, input);
        if (input.len == 2) return initTwo(allocator, input);
        if (input.len == 3) return initThree(allocator, input);
        if (input.len == 4) return initFour(allocator, input);
        
        @compileError("Expected tuple with up to 4 fields. Recieved: " ++ type_name);
    }

    pub fn deinit(self: Element) void {
        switch (self) {
            .tag => |tag| tag.deinit(),
            .list => |list| {
                for (list.items) |element| element.deinit();
                list.deinit();
            },
            .nil => {},
            .text => {},
            .raw => {},
        }
    }

    pub fn initOne(allocator: Allocator, input: anytype) !Element {
        const name = try Tag.extractName(input[0]);
        const attributes = try initAttributes(allocator, .{});
        const contents = try initContents(allocator, .{});
        return .{ .tag = .{ .name = name, .is_void = true, .attributes = attributes, .contents = contents } };
    }

    pub fn initTwo(allocator: Allocator, input: anytype) !Element {
        // Non-void tag without attributes or children
        const name = try Tag.extractName(input[0]);
        if (comptime util.isZigString(@TypeOf(input[1]))) {
            const attributes = try initAttributes(allocator, .{});
            const contents = try initContents(allocator, .{});
            if (!Tag.matchEndTag(name, input[1])) return error.HtmlParseError;
            return .{ .tag = .{ .name = name, .contents = contents, .attributes = attributes } };
        }

        // Void tag with attributes
        const attributes = try initAttributes(allocator, input[1]);
        const contents = try initContents(allocator, .{});
        return .{ .tag = .{ .name = name, .is_void = true, .attributes = attributes, .contents = contents } };
    }

    pub fn initThree(allocator: Allocator, input: anytype) !Element {
        // Component without components
        if (comptime isComponent(@TypeOf(input[1]))) {
            if (!mem.eql(u8, input[0], "<")) return error.HtmlParseError;
            if (!mem.eql(u8, input[2], "/>")) return error.HtmlParseError;
            return input[1].build(allocator);
        }

        // Non-void tag with attributes, but no contents
        if (comptime isAttributes(@TypeOf(input[1]))) {
            const name = try Tag.extractName(input[0]);
            if (!Tag.matchEndTag(name, input[2])) return error.HtmlParseError;
            const attributes = try initAttributes(allocator, input[1]);
            const contents = try initContents(allocator, .{});
            return .{ .tag = .{ .name = name, .attributes = attributes, .contents = contents } };
        }

        // List with contents
        if (mem.eql(u8, input[0], "<>")) {
            if (!mem.eql(u8, input[2], "</>")) return error.HtmlParseError;
            const contents = try initContents(allocator, input[1]);
            return .{ .list = contents };
        }

        // Non-void tag with contents, but no attributes
        const name = try Tag.extractName(input[0]);
        if (!Tag.matchEndTag(name, input[2])) return error.HtmlParseError;
        const contents = try initContents(allocator, input[1]);
        const attributes = try initAttributes(allocator, .{});
        return .{ .tag = .{ .name = name, .contents = contents, .attributes = attributes } };
    }

    pub fn initFour(allocator: Allocator, input: anytype) !Element {
        // Component with contents
        if (comptime isComponent(@TypeOf(input[1]))) {
            if (!mem.eql(u8, input[0], "<")) return error.HtmlParseError;
            if (!mem.eql(u8, input[3], "/>")) return error.HtmlParseError;
            const contents = try initContents(allocator, input[2]);
            return input[1].build(allocator, contents);
        }

        // Non-void tag with attributes and contents
        const name = try Tag.extractName(input[0]);
        if (!Tag.matchEndTag(name, input[3])) return error.HtmlParseError;
        const attributes = try initAttributes(allocator, input[1]);
        const contents = try initContents(allocator, input[2]);
        return .{ .tag = .{ .name = name, .attributes = attributes, .contents = contents } };
    }

    pub fn isAttributes(input_type: anytype) bool {
        const info = @typeInfo(input_type);
        if (info != .Struct) return false;
        if (@hasDecl(input_type, "build")) return false;
        if (info.Struct.fields.len > 0 and info.Struct.is_tuple) return false;
        return true;
    }

    pub fn initAttributes(allocator: Allocator, input: anytype) !ArrayList(Attribute) {
        const input_type: type = @TypeOf(input);
        if (input_type == ArrayList(Attribute)) return input;
        const type_name = @typeName(input_type);
        const info = @typeInfo(input_type);
        if (info != .Struct) @compileError("Expected non-tuple struct. Received: " ++ type_name);
        const fields = info.Struct.fields;
        if (fields.len == 0) return ArrayList(Attribute).init(allocator);
        if (info.Struct.is_tuple) @compileError("Expected non-tuple struct. Received: " ++ type_name);
        var attributes = try ArrayList(Attribute).initCapacity(allocator, fields.len);
        errdefer attributes.deinit();
        inline for (fields) |field| {
            const name = field.name;
            if (!Attribute.isValidName(name)) return error.HtmlParseError;
            const value = @field(input, name);
            const attribute = try Attribute.init(allocator, name, value);
            try attributes.append(attribute);
        }
        return attributes;
    }

    pub fn initContents(allocator: Allocator, input: anytype) !ArrayList(Element) {
        const input_type = @TypeOf(input);
        
        // Wrap a string into a list of one element
        if (comptime util.isZigString(input_type)) {
            var elements = try ArrayList(Element).initCapacity(allocator, 1);
            try elements.append(.{ .text = input });
            return elements;
        }

        // ArrayList of Elements
        if (input_type == ArrayList(Element)) return input;

        // Tuple with fields representing elements
        var elements = try ArrayList(Element).initCapacity(allocator, input.len);
        inline for (input) |item| {
            const element = try Element.init(allocator, item);
            try elements.append(element);
        }
        return elements;
    }

    pub fn isComponent(input_type: anytype) bool {
        return @typeInfo(input_type) == .Struct and @hasDecl(input_type, "build");
    }

    pub fn render(self: Element, result: *ArrayList(u8)) !void {
        switch (self) {
            .nil => {},
            .text => |text| { 
                for (text) |char|
            }
        }
    }
};

const testing = std.testing;
const expect = testing.expect;
const expectEqualStrings = testing.expectEqualStrings;
const expectEqualDeep = testing.expectEqualDeep;

fn expectInit(alloc: Allocator, expected: Element, input: anytype) !void {
    const actual = try Element.init(alloc, input);
    defer actual.deinit();
    try expectEqualDeep(expected, actual);
}

test "Element.init returns .nil for empty inputs" {
    const alloc = testing.allocator;
    try expectInit(alloc, .nil, {});
    try expectInit(alloc, .nil, null);
    try expectInit(alloc, .nil, Element.nil);
    try expectInit(alloc, .nil, .{});
}

test "Element.init returns an existing element as is" {
    const input = Element{ .text = "Hello, world"};
    const expected = input;
    try expectInit(testing.allocator, expected, input);
}

test "Element.init wraps a string into Element.text" {
    const expected = Element{ .text = "Hello, world" };
    try expectInit(testing.allocator, expected, "Hello, world");
}

test "Element.init and Element.initOne for tuple of 1" {
    const alloc = testing.allocator;
    const input = .{ "<br>" };
    const expected = Element{ .tag = .{ 
        .name = "br",
        .is_void = true,
        .attributes = ArrayList(Attribute).init(alloc),
        .contents = ArrayList(Element).init(alloc),
    } };
    defer expected.deinit();
    const actual = try Element.initOne(alloc, input);
    defer actual.deinit();
    try expectEqualDeep(expected, actual);
    try expectInit(alloc, expected, input);
}

test "Element.init and Element.initTwo for tuple of 2" {
    const alloc = testing.allocator;

    {
        // Non-void tag without attributes
        const input = .{ "<div>", "</div>" };
        const expected = Element{ .tag = .{
            .name = "div",
            .attributes = ArrayList(Attribute).init(alloc),
            .contents = ArrayList(Element).init(alloc),
        } };
        defer expected.deinit();
        const actual = try Element.initTwo(alloc, input);
        defer actual.deinit();
        try expectEqualDeep(expected, actual);
        try expectInit(alloc, expected, input);
    }
    
    {
        // Void tag with attributes
        const raw_attrs = .{ .class = "container", .style = "margin-top:10px;" };
        const input = .{ "<br>",  raw_attrs};
        const attributes = try Element.initAttributes(alloc, raw_attrs);
        const expected = Element{ .tag = .{
            .name = "br",
            .is_void = true,
            .attributes = attributes,
            .contents = ArrayList(Element).init(alloc),
        } };
        defer expected.deinit();
        const actual = try Element.initTwo(alloc, input);
        defer actual.deinit();
        try expectEqualDeep(expected, actual);
        try expectInit(alloc, expected, input);
    }

}

fn expectInitThree(alloc: Allocator, expected: Element, input: anytype) !void {
    const actual = try Element.initThree(alloc, input);
    defer actual.deinit();
    try expectEqualDeep(expected, actual);
}

test "Element.init and Element.initThree for tuple of 3" {
    const alloc = testing.allocator;

    {
        // Component with props, but no contents
        const ColoredHr = struct {
            color: []const u8,

            pub fn build(self: @This(), allocator: Allocator) !Element {
                var style = ArrayList(u8).init(allocator);
                try style.appendSlice("border-color: ");
                try style.appendSlice(self.color);
                try style.appendSlice(";");
                defer style.deinit();
                return Element.init(allocator, .{ "<hr>", .{ .style = style.items } });
            }
        };

        const input = .{ "<", ColoredHr{ .color = "blue"}, "/>" };
        const expected = Element{ .tag = .{
            .name = "hr",
            .is_void = true,
            .attributes = try Element.initAttributes(alloc, .{ .style = "border-color: blue;" }),
            .contents = ArrayList(Element).init(alloc),
        }};
        defer expected.deinit();
        try expectInitThree(alloc, expected, input);
        try expectInit(alloc, expected, input);
    }

    {
        // Non-void tag with attributes, but no contents
        const input = .{"<div>", .{ .class = "container", .style = "margin-top: 10px;"}, "</div>"};
        const expected = Element{ .tag = .{
            .name = "div",
            .attributes = try Element.initAttributes(alloc, .{ 
                .class = "container",
                .style = "margin-top: 10px;",
            }),
            .contents = ArrayList(Element).init(alloc),
        } };
        defer expected.deinit();
        try expectInitThree(alloc, expected, input);
        try expectInit(alloc, expected, input);
    }

    {
        // List with contents (single string)
        const input = .{"<>", "Hello, world", "</>"};
        const expected = Element{ .list = try Element.initContents(alloc, "Hello, world") };
        defer expected.deinit();
        try expectInitThree(alloc, expected, input);
        try expectInit(alloc, expected, input);
    }

    {
        // Non-void tag with contents, but no attributes
        const input = .{"<div>", .{ 
            .{"<h1>", "Page Title", "</h1>"},
            .{"<span>", "Page Content", "</span>"},
        }, "</div>"};
        const expected = Element{ .tag = .{ 
            .name = "div",
            .contents = try Element.initContents(alloc, .{ 
                .{"<h1>", "Page Title", "</h1>"},
                .{"<span>", "Page Content", "</span>"},
            }),
            .attributes = try Element.initAttributes(alloc, .{}),
        } };
        defer expected.deinit();
        try expectInitThree(alloc, expected, input);
        try expectInit(alloc, expected, input);

    }

    {
        // List with contents (tuple of inputs)
        const input = .{"<>", .{ 
            .{"<h1>", "Page Title", "</h1>"},
            .{"<span>", "Page Content", "</span>"},
        }, "</>"};
        const expected = Element{ .list = try Element.initContents(alloc, .{ 
            .{"<h1>", "Page Title", "</h1>"},
            .{"<span>", "Page Content", "</span>"},
        })};
        defer expected.deinit();
        try expectInitThree(alloc, expected, input);
        try expectInit(alloc, expected, input);
    }
}

fn expectInitFour(alloc: Allocator, expected: Element, input: anytype) !void {
    const actual = try Element.initFour(alloc, input);
    defer actual.deinit();
    try expectEqualDeep(expected, actual);
}

test "Element.init and Element.initFour for tuple of 4" {   
    const alloc = testing.allocator;

    {
        // Component with contents
        const ColoredDiv = struct {
            color: []const u8,

            pub fn build(self: @This(), allocator: Allocator, contents: ArrayList(Element)) !Element {
                var style = ArrayList(u8).init(allocator);
                try style.appendSlice("color: ");
                try style.appendSlice(self.color);
                try style.appendSlice(";");
                defer style.deinit();

                return Element.init(
                    allocator, 
                    .{ "<div>", .{ .style = style.items }, contents, "</div>" },
                );
            }
        };
        
        const input = .{ "<", ColoredDiv{ .color = "blue" }, "Hello, blue", "/>"};
        const expected = Element{ .tag = .{
            .name = "div",
            .attributes = try Element.initAttributes(alloc, .{ .style = "color: blue;"}),
            .contents = try Element.initContents(alloc, "Hello, blue"),
        } };
        defer expected.deinit();
        try expectInitFour(alloc, expected, input);
        try expectInit(alloc, expected, input);
    }

    {
        // Non-void tag with attributes and contents
        const input = .{ "<div>", .{ .class = "container", .style = "margin-top: 10px;"}, .{
            .{"<h1>", "Page Title", "</h1>"},
            .{"<span>", "Page Content", "</span>"},
        }, "</div>" };
        const expected = Element{ .tag = .{
            .name = "div",
            .attributes = try Element.initAttributes(alloc, 
                .{ .class = "container", .style = "margin-top: 10px;"}),
            .contents = try Element.initContents(alloc, .{
                .{"<h1>", "Page Title", "</h1>"},
                .{"<span>", "Page Content", "</span>"},
            }),
        }};
        defer expected.deinit();
        try expectInitFour(alloc, expected, input);
        try expectInit(alloc, expected, input);
    }

}

test "Element.deinit" {
    // TODO
}

test "Element.isAttributes" {
    // TODO
}

test "Element.initAttributes" {
    // TODO
}

test "Element.initContents" {
    // TODO
}

test "Element.isComponent" {
    // TODO 
}

test "Element.render" {
    // TODO
}


