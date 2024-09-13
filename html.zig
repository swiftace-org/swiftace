const std = @import("std");
const mem = std.mem;
const util = @import("./html/util.zig");
const ArrayList = std.ArrayList;
const Allocator = mem.Allocator;

const testing = std.testing;
const expect = testing.expect;
const expectEqual = testing.expectEqual;
const expectEqualStrings = testing.expectEqualStrings;
const expectEqualDeep = testing.expectEqualDeep;
const expectEqualSlices = testing.expectEqualSlices;
const expectError = testing.expectError;

// TODO
// - [ ] Inilne some smaller functions (?) - does the compiler automatically do it?
// - [ ] Move attribute init and renderAll to Attribute (from Tag)
// - [ ] Allow tag names to be passed as arraylists (not just strings)

pub fn raw(input: anytype) !Element {
    const text = try Text.init(input);
    return .{ .raw = text };
}

pub const Text = SliceOrList(u8);

pub const Elements = SliceOrList(Element);

pub const Element = union(enum) {
    nil: void,
    text: Text,
    raw: Text,
    tag: Tag,
    list: Elements,

    const nil: Element = .nil;

    pub fn init(allocator: Allocator, input: anytype) !Element {
        const InputType: type = @TypeOf(input);
        if (InputType == void) return .nil;
        if (InputType == @TypeOf(null)) return .nil;
        if (InputType == Element) return input;
        if (comptime Text.canInit(InputType)) return .{ .text = Text.init(input) };

        const info = @typeInfo(InputType);
        const type_name = @typeName(InputType);
        if (info != .Struct or !info.Struct.is_tuple) @compileError("Expected tuple. Received: " ++ type_name);
        if (input.len == 0) return .nil;
        if (input.len == 1) return initOne(input);
        if (input.len == 2) return initTwo(allocator, input);
        if (input.len == 3) return initThree(allocator, input);
        if (input.len == 4) return initFour(allocator, input);

        @compileError("Expected tuple with up to 4 fields. Recieved: " ++ type_name);
    }

    pub fn deinit(self: Element) void {
        switch (self) {
            .nil => {},
            .tag => |tag| tag.deinit(),
            .list => |list| {
                for (list.items()) |element| element.deinit();
                list.deinit();
            },
            .text => |text| text.deinit(),
            .raw => |text| text.deinit(),
        }
    }

    pub fn render(self: Element, result: *ArrayList(u8)) !void {
        _ = &result;
        switch (self) {
            .nil => {},
            else => {}, // TODO
        }
    }

    pub fn initOne(input: anytype) !Element {
        const name = try Tag.extractName(input[0]);
        return .{ .tag = .{ .name = Text.init(name), .is_void = true } };
    }

    pub fn initTwo(allocator: Allocator, input: anytype) !Element {
        // Non-void tag without attributes or children
        const name = try Tag.extractName(input[0]);
        if (comptime util.isZigString(@TypeOf(input[1]))) {
            if (!Tag.matchEndTag(name, input[1])) return error.HtmlParseError;
            return .{ .tag = .{ .name = Text.init(name) } };
        }

        // Void tag with attributes
        const attributes = try initAttributes(allocator, input[1]);
        return .{ .tag = .{ .name = Text.init(name), .is_void = true, .attributes = attributes } };
    }

    pub fn initThree(allocator: Allocator, input: anytype) !Element {
        // Component without components
        if (comptime isComponent(@TypeOf(input[1]))) {
            if (!mem.eql(u8, input[0], "<")) return error.HtmlParseError;
            if (!mem.eql(u8, input[2], "/>")) return error.HtmlParseError;
            return input[1].build(allocator);
        }

        // Non-void tag with attributes, but no contents
        if (comptime canInitAttributes(@TypeOf(input[1]))) {
            const name = try Tag.extractName(input[0]);
            if (!Tag.matchEndTag(name, input[2])) return error.HtmlParseError;
            const attributes = try initAttributes(allocator, input[1]);
            return .{ .tag = .{ .name = Text.init(name), .attributes = attributes } };
        }

        // List with contents
        if (mem.eql(u8, input[0], "<>")) {
            if (!mem.eql(u8, input[2], "</>")) return error.HtmlParseError;
            const contents = try initElements(allocator, input[1]);
            return .{ .list = contents };
        }

        // Non-void tag with contents, but no attributes
        const name = try Tag.extractName(input[0]);
        if (!Tag.matchEndTag(name, input[2])) return error.HtmlParseError;
        const contents = try initElements(allocator, input[1]);
        const attributes = try initAttributes(allocator, .{});
        return .{ .tag = .{ .name = Text.init(name), .contents = contents, .attributes = attributes } };
    }

    pub fn initFour(allocator: Allocator, input: anytype) !Element {
        // Component with contents
        if (comptime isComponent(@TypeOf(input[1]))) {
            if (!mem.eql(u8, input[0], "<")) return error.HtmlParseError;
            if (!mem.eql(u8, input[3], "/>")) return error.HtmlParseError;
            const contents = try initElements(allocator, input[2]);
            return input[1].build(allocator, contents);
        }

        // Non-void tag with attributes and contents
        const name = try Tag.extractName(input[0]);
        if (!Tag.matchEndTag(name, input[3])) return error.HtmlParseError;
        const attributes = try initAttributes(allocator, input[1]);
        const contents = try initElements(allocator, input[2]);
        return .{ .tag = .{ .name = Text.init(name), .attributes = attributes, .contents = contents } };
    }

    pub fn isComponent(input_type: anytype) bool {
        return @typeInfo(input_type) == .Struct and @hasDecl(input_type, "build");
    }
};

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
    const input = Element{ .text = Text.init("Hello, world") };
    const expected = input;
    try expectInit(testing.allocator, expected, input);
}

test "Element.init wraps a string into Element.text" {
    const expected = Element{ .text = Text.init("Hello, world") };
    try expectInit(testing.allocator, expected, "Hello, world");
}

test "Element.init and Element.initOne - Tuple of 1" {
    const alloc = testing.allocator;
    const input = .{"<br>"};
    const expected = Element{ .tag = .{ .name = Text.init("br"), .is_void = true } };
    defer expected.deinit();
    const actual = try Element.initOne(input);
    defer actual.deinit();
    try expectEqualDeep(expected, actual);
    try expectInit(alloc, expected, input);
}

test "Element.init and Element.initTwo - Tuple of 2" {
    const alloc = testing.allocator;

    {
        // Non-void tag without attributes
        const input = .{ "<div>", "</div>" };
        const expected = Element{ .tag = .{ .name = Text.init("div") } };
        defer expected.deinit();
        const actual = try Element.initTwo(alloc, input);
        defer actual.deinit();
        try expectEqualDeep(expected, actual);
        try expectInit(alloc, expected, input);
    }

    {
        // Void tag with attributes
        const raw_attrs = .{ .class = "container", .style = "margin-top:10px;" };
        const input = .{ "<br>", raw_attrs };
        const attributes = try initAttributes(alloc, raw_attrs);
        const expected = Element{ .tag = .{
            .name = Text.init("br"),
            .is_void = true,
            .attributes = attributes,
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

test "Element.init and Element.initThree - Tuple of 3" {
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
                return Element.init(allocator, .{ "<hr>", .{ .style = style } });
            }
        };

        const input = .{ "<", ColoredHr{ .color = "blue" }, "/>" };
        var style = ArrayList(u8).init(alloc);
        try style.appendSlice("border-color: blue;");
        const expected = Element{ .tag = .{
            .name = Text.init("hr"),
            .is_void = true,
            .attributes = try initAttributes(alloc, .{ .style = style }),
        } };
        defer expected.deinit();
        try expectInitThree(alloc, expected, input);
        try expectInit(alloc, expected, input);
    }

    {
        // Non-void tag with attributes, but no contents
        const input = .{ "<div>", .{ .class = "container", .style = "margin-top: 10px;" }, "</div>" };
        const expected = Element{ .tag = .{
            .name = Text.init("div"),
            .attributes = try initAttributes(alloc, .{
                .class = "container",
                .style = "margin-top: 10px;",
            }),
        } };
        defer expected.deinit();
        try expectInitThree(alloc, expected, input);
        try expectInit(alloc, expected, input);
    }

    {
        // List with contents (single string), but no attributes
        const input = .{ "<>", "Hello, world", "</>" };
        const expected = Element{ .list = try initElements(alloc, "Hello, world") };
        defer expected.deinit();
        try expectInitThree(alloc, expected, input);
        try expectInit(alloc, expected, input);
    }

    {
        // Non-void tag with contents, but no attributes
        const input = .{ "<div>", .{
            .{ "<h1>", "Page Title", "</h1>" },
            .{ "<span>", "Page Content", "</span>" },
        }, "</div>" };
        const expected = Element{ .tag = .{
            .name = Text.init("div"),
            .contents = try initElements(alloc, .{
                .{ "<h1>", "Page Title", "</h1>" },
                .{ "<span>", "Page Content", "</span>" },
            }),
            .attributes = try initAttributes(alloc, .{}),
        } };
        defer expected.deinit();
        try expectInitThree(alloc, expected, input);
        try expectInit(alloc, expected, input);
    }

    {
        // List with contents (tuple of inputs)
        const input = .{ "<>", .{
            .{ "<h1>", "Page Title", "</h1>" },
            .{ "<span>", "Page Content", "</span>" },
        }, "</>" };
        const expected = Element{ .list = try initElements(alloc, .{
            .{ "<h1>", "Page Title", "</h1>" },
            .{ "<span>", "Page Content", "</span>" },
        }) };
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

            pub fn build(self: @This(), allocator: Allocator, contents: Elements) !Element {
                var style = ArrayList(u8).init(allocator);
                try style.appendSlice("color: ");
                try style.appendSlice(self.color);
                try style.appendSlice(";");

                return Element.init(
                    allocator,
                    .{ "<div>", .{ .style = style }, contents, "</div>" },
                );
            }
        };

        const input = .{ "<", ColoredDiv{ .color = "blue" }, "Hello, blue", "/>" };
        var style = ArrayList(u8).init(alloc);
        try style.appendSlice("color: blue;");
        const expected = Element{ .tag = .{
            .name = Text.init("div"),
            .attributes = try initAttributes(alloc, .{ .style = style }),
            .contents = try initElements(alloc, "Hello, blue"),
        } };
        defer expected.deinit();
        try expectInitFour(alloc, expected, input);
        try expectInit(alloc, expected, input);
    }

    {
        // Non-void tag with attributes and contents
        const input = .{ "<div>", .{ .class = "container", .style = "margin-top: 10px;" }, .{
            .{ "<h1>", "Page Title", "</h1>" },
            .{ "<span>", "Page Content", "</span>" },
        }, "</div>" };
        const expected = Element{ .tag = .{
            .name = Text.init("div"),
            .attributes = try initAttributes(alloc, .{ .class = "container", .style = "margin-top: 10px;" }),
            .contents = try initElements(alloc, .{
                .{ "<h1>", "Page Title", "</h1>" },
                .{ "<span>", "Page Content", "</span>" },
            }),
        } };
        defer expected.deinit();
        try expectInitFour(alloc, expected, input);
        try expectInit(alloc, expected, input);
    }
}

test "Element.render" {
    // TODO
}

pub fn initElements(allocator: Allocator, input: anytype) !Elements {
    const InputType: type = @TypeOf(input);

    // Wrap a string into a list of one element
    if (comptime Text.canInit(InputType)) {
        const element = try Element.init(allocator, input);
        var elements = try ArrayList(Element).initCapacity(allocator, 1);
        try elements.append(element);
        return .{ .list = elements };
    }

    // ArrayList of Elements
    if (comptime Elements.canInit(InputType)) return Elements.init(input);

    // Tuple with fields representing elements
    var elements = try ArrayList(Element).initCapacity(allocator, input.len);
    errdefer elements.deinit();
    inline for (input) |item| {
        const element = try Element.init(allocator, item);
        try elements.append(element);
    }
    return .{ .list = elements };
}

test "Element.initContents" {
    // TODO
}

pub const Attributes = SliceOrList(Attribute);

pub const Tag = struct {
    name: Text,
    is_void: bool = false,
    attributes: Attributes = Attributes.empty,
    contents: Elements = Elements.empty,

    pub fn deinit(self: Tag) void {
        deinitAttributes(self.attributes);
        for (self.contents.items()) |element| element.deinit();
        self.contents.deinit();
    }

    pub fn render(self: Tag, result: *ArrayList(u8)) !void {
        try result.append('<');
        try result.appendSlice(self.name.items());
        try renderAttributes(self.attributes, result);
        try result.append('>');
        if (self.is_void) return;
        for (self.contents.items()) |element| try element.render(result);
        try result.appendSlice("</");
        try result.appendSlice(self.name.item());
        try result.append('>');
    }

    pub fn extractName(start_tag: []const u8) ![]const u8 {
        if (start_tag.len < 3) return error.HtmlParseError;
        if (start_tag[0] != '<') return error.HtmlParseError;
        if (start_tag[start_tag.len - 1] != '>') return error.HtmlParseError;
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
};

fn expectTagRender(alloc: Allocator, expected: []const u8, input: anytype) !void {
    const element = try Element.init(alloc, input);
    defer element.deinit();
    var actual = ArrayList(u8).init(alloc);
    defer actual.deinit();
    try element.tag.render(&actual);
    try expectEqualStrings(expected, actual.items);
}

test "Tag.deinit" {
    // TODO - skip?
}

test "Tag.render" {
    // TODO
}

test "Tag.extractName" {
    const extractName = Tag.extractName;

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

test "Tag.isValidName" {
    const isValidName = Tag.isValidName;

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

test "Tag.matchEndTag" {
    const matchEndTag = Tag.matchEndTag;

    try expect(matchEndTag("div", "</div>") == true); // Correct match
    try expect(matchEndTag("span", "</div>") == false); // Incorrect tag name
    try expect(matchEndTag("div", "<div>") == false); // Missing slash
    try expect(matchEndTag("div", "</div") == false); // Tag not properly closed
    try expect(matchEndTag("", "</>") == false); // Too short tag
    try expect(matchEndTag("a", "</a>") == true); // Single character tag
}

pub fn canInitAttributes(InputType: type) bool {
    if (Attributes.canInit(InputType)) return true;
    const info = @typeInfo(InputType);
    if (info != .Struct) return false;
    if (@hasDecl(InputType, "build")) return false;
    if (info.Struct.fields.len > 0 and info.Struct.is_tuple) return false;
    return true;
}

test canInitAttributes {

    // Valid slice, ArrayList or SliceOrList
    try expect(canInitAttributes([]const Attribute));
    try expect(canInitAttributes(ArrayList(Attribute)));
    try expect(canInitAttributes(Attributes));

    // Valid struct of key-value pairs
    const valid_struct = .{ .class = "container", .id = "main" };
    try expect(canInitAttributes(@TypeOf(valid_struct)));

    // Invalid types
    try expect(!canInitAttributes([]const u8));
    try expect(!canInitAttributes(u32));

    // Invalid struct with "build" declaration
    const InvalidStruct = struct {
        class: []const u8,
        fn build() void {}
    };
    try expect(!canInitAttributes(InvalidStruct));

    // Invalid tuple
    try expect(!canInitAttributes(struct { []const u8, []const u8 }));
}

pub fn initAttributes(allocator: Allocator, input: anytype) !Attributes {
    const InputType: type = @TypeOf(input);

    // Already a slice, arraylist, or SliceOrList of Attribute
    if (comptime Attributes.canInit(InputType)) return Attributes.init(input);

    // Compilation error for invalid input types
    const info = @typeInfo(InputType);
    if (info != .Struct) @compileError("Expected non-tuple struct. Received: " ++ @typeName(InputType));
    const fields = info.Struct.fields;
    if (fields.len == 0) return Attributes.empty;
    if (info.Struct.is_tuple) @compileError("Expected non-tuple struct. Received: " ++ @typeName(InputType));

    // Non-tuple struct of key-value pairs
    var attrs_list = try ArrayList(Attribute).initCapacity(allocator, fields.len);
    errdefer attrs_list.deinit();
    inline for (fields) |field| {
        const name = field.name;
        if (!Attribute.isValidName(name)) return error.HtmlParseError;
        const value = @field(input, name);
        const attribute = Attribute.init(name, value);
        try attrs_list.append(attribute);
    }
    return Attributes.init(attrs_list);
}

pub fn deinitAttributes(attributes: Attributes) void {
    for (attributes.items()) |attribute| attribute.deinit();
    attributes.deinit();
}

test initAttributes {
    const alloc = testing.allocator;

    // Slice of attributes
    const attrs1: []const Attribute = &.{
        Attribute.init("class", "test-class"),
        Attribute.init("id", "test-id"),
    };
    const result1 = try initAttributes(alloc, attrs1);
    defer result1.deinit();
    try expectEqualDeep(result1.items(), attrs1);

    // ArrayList of Attribute
    var list2 = ArrayList(Attribute).init(alloc);
    try list2.append(Attribute.init("class", "test-class"));
    const result2 = try initAttributes(alloc, list2);
    defer result2.deinit();
    try expectEqualDeep(result2.items(), list2.items);

    // Struct of key-value pairs
    const input3 = .{ .class = "test-class", .id = "test-id" };
    const result3 = try initAttributes(alloc, input3);
    defer result3.deinit();
    const items3 = result3.items();
    try expectEqual(items3.len, 2);
    try expectEqualStrings(items3[0].name.items(), "class");
    try expectEqualStrings(items3[0].value.text.items(), "test-class");
    try expectEqualStrings(items3[1].name.items(), "id");

    // Empty struct
    const result4 = try initAttributes(alloc, .{});
    defer result4.deinit();
    try expectEqual(result4.items().len, 0);

    // Test error cases
    const invalid_input = .{ .@"invalid name" = "somevalue" };
    try expectError(error.HtmlParseError, initAttributes(alloc, invalid_input));
}

pub fn renderAttributes(attributes: Attributes, result: *ArrayList(u8)) !void {
    for (attributes.items()) |attribute| {
        if (attribute.value == .present and !attribute.value.present) continue;
        try result.append(' ');
        try attribute.render(result);
    }
}

test renderAttributes {
    const alloc = testing.allocator;
    var result = ArrayList(u8).init(alloc);
    defer result.deinit();

    // Empty Struct
    try renderAttributes(Attributes.empty, &result);
    try expectEqualStrings("", result.items);
    result.clearRetainingCapacity();

    // Render a single text attribute
    const attributes2 = try initAttributes(alloc, .{ .class = "container" });
    defer deinitAttributes(attributes2);
    try renderAttributes(attributes2, &result);
    try expectEqualStrings(" class=\"container\"", result.items);
    result.clearRetainingCapacity();

    // Multiple attributes of different types
    const attributes3 = try initAttributes(alloc, .{
        .id = "main",
        .disabled = true,
        .checked = false,
        .@"data-value" = "10 < 20 & \"quote\"",
    });
    defer deinitAttributes(attributes3);
    try renderAttributes(attributes3, &result);
    try expectEqualStrings(" id=\"main\" disabled data-value=\"10 &lt; 20 &amp; &quot;quote&quot;\"", result.items);
    result.clearRetainingCapacity();

    // Test with attributes containing special characters in names
    const special_attrs = try initAttributes(alloc, .{
        .@"data:custom" = "value",
        .@"aria-label" = "Description",
    });
    defer deinitAttributes(special_attrs);
    try renderAttributes(special_attrs, &result);
    try expectEqualStrings(" data:custom=\"value\" aria-label=\"Description\"", result.items);
    result.clearRetainingCapacity();
}

pub const Attribute = struct {
    name: Text,
    value: Value,

    const Value = union(enum) {
        text: Text,
        present: bool,
    };

    pub fn init(raw_name: anytype, raw_value: anytype) Attribute {
        const name = Text.init(raw_name);
        if (@TypeOf(raw_value) == bool) {
            return .{ .name = name, .value = .{ .present = raw_value } };
        }
        return .{ .name = name, .value = .{ .text = Text.init(raw_value) } };
    }

    pub fn deinit(self: Attribute) void {
        self.name.deinit();
        if (self.value == .text) self.value.text.deinit();
    }

    /// Render a single `Attribute` into its HTML string representation.
    pub fn render(self: Attribute, result: *ArrayList(u8)) !void {
        switch (self.value) {
            .text => |text| {
                try result.appendSlice(self.name.items());
                try result.append('=');
                try result.append('"');
                for (text.items()) |char| {
                    switch (char) {
                        '&' => try result.appendSlice("&amp;"),
                        '<' => try result.appendSlice("&lt;"),
                        '>' => try result.appendSlice("&gt;"),
                        '"' => try result.appendSlice("&quot;"),
                        '\'' => try result.appendSlice("&#39;"),
                        else => try result.append(char),
                    }
                }
                try result.append('"');
            },
            .present => |present| {
                if (present) try result.appendSlice(self.name.items());
            },
        }
    }

    /// Check if an attribute name is valid according to the HTML spec.
    pub fn isValidName(name: []const u8) bool {
        if (name.len == 0) return false;
        for (name) |char| {
            switch (char) {
                0x00...0x1F, // Control characters
                0x20, // Space
                0x22, // "
                0x27, // '
                0x3E, // >
                0x2F, // /
                0x3D, // =
                => return false,
                else => {},
            }
        }
        return true;
    }
};

test "Attribute.init and Attribute.deinit" {
    // Text value
    const attr1 = Attribute.init("class", "my-class");
    defer attr1.deinit();
    try testing.expectEqualStrings("class", attr1.name.items());
    try testing.expect(attr1.value == .text);
    try testing.expectEqualStrings("my-class", attr1.value.text.items());

    // Boolean value
    const attr2 = Attribute.init("disabled", true);
    defer attr2.deinit();
    try testing.expectEqualStrings("disabled", attr2.name.items());
    try testing.expect(attr2.value == .present);
    try testing.expect(attr2.value.present == true);
}

test "Attribute.render" {
    const alloc = testing.allocator;
    var result = ArrayList(u8).init(alloc);
    defer result.deinit();

    // Render a text attribute
    const attr1 = Attribute{
        .name = Text.init("class"),
        .value = .{ .text = Text.init("container") },
    };
    try attr1.render(&result);
    try expectEqualStrings("class=\"container\"", result.items);
    result.clearRetainingCapacity();

    // Render a present boolean attribute
    const attr2 = Attribute{
        .name = Text.init("disabled"),
        .value = .{ .present = true },
    };
    try attr2.render(&result);
    try expectEqualStrings("disabled", result.items);
    result.clearRetainingCapacity();

    // Render an absent boolean attribute
    const attr3 = Attribute{
        .name = Text.init("checked"),
        .value = .{ .present = false },
    };
    try attr3.render(&result);
    try expectEqualStrings("", result.items);
    result.clearRetainingCapacity();

    // Render a text attribute with special characters
    const attr4 = Attribute{
        .name = Text.init("data"),
        .value = .{ .text = Text.init("a < b & c > d \"quote\" 'apostrophe'") },
    };
    try attr4.render(&result);
    try expectEqualStrings(
        "data=\"a &lt; b &amp; c &gt; d &quot;quote&quot; &#39;apostrophe&#39;\"",
        result.items,
    );
    result.clearRetainingCapacity();
}

test "Attribute.isValidName" {
    const isValidName = Attribute.isValidName;

    // Valid Names
    try expect(isValidName("valid-name"));
    try expect(isValidName("valid_name"));
    try expect(isValidName("validName123"));
    try expect(isValidName("!@#$%^&*()"));

    // Invalid Names
    try expect(!isValidName(""));
    try expect(!isValidName(" invalid"));
    try expect(!isValidName("invalid\"name"));
    try expect(!isValidName("invalid'name"));
    try expect(!isValidName("invalid>name"));
    try expect(!isValidName("invalid/name"));
    try expect(!isValidName("invalid=name"));
}

pub fn SliceOrList(T: type) type {
    return union(enum) {
        slice: []const T,
        list: ArrayList(T),

        const empty: @This() = .{ .slice = &.{} };

        pub fn init(slice_or_list: anytype) @This() {
            const InputType: type = @TypeOf(slice_or_list);
            if (InputType == SliceOrList(T)) return slice_or_list;
            if (InputType == ArrayList(T)) return .{ .list = slice_or_list };
            return .{ .slice = slice_or_list };
        }

        pub fn deinit(self: @This()) void {
            if (self == .list) self.list.deinit();
        }

        pub fn items(self: @This()) []const T {
            return switch (self) {
                .list => |list| list.items,
                .slice => |slice| slice,
            };
        }

        pub fn canInit(InputType: type) bool {
            return InputType == SliceOrList(T) or
                InputType == ArrayList(T) or
                util.isSliceOf(InputType, T);
        }
    };
}

test "SliceOrList.init with slice" {
    const slice = &[_]u32{ 1, 2, 3, 4, 5 };
    const sol = SliceOrList(u32).init(slice);
    try testing.expect(sol == .slice);
    try testing.expectEqualSlices(u32, slice, sol.slice);
}

test "SliceOrList.init with ArrayList" {
    var list = ArrayList(u32).init(testing.allocator);
    defer list.deinit();
    try list.appendSlice(&[_]u32{ 1, 2, 3, 4, 5 });

    const sol = SliceOrList(u32).init(list);
    try testing.expect(sol == .list);
    try testing.expectEqualSlices(u32, list.items, sol.list.items);
}

test "SliceOrList.deinit with slice" {
    const slice = &[_]u32{ 1, 2, 3, 4, 5 };
    var sol = SliceOrList(u32).init(slice);
    sol.deinit(); // This should not cause any issues
}

test "SliceOrList.deinit with ArrayList" {
    var list = ArrayList(u32).init(testing.allocator);
    try list.appendSlice(&[_]u32{ 1, 2, 3, 4, 5 });

    var sol = SliceOrList(u32).init(list);
    sol.deinit(); // This should free the memory allocated by the ArrayList
}

test "SliceOrList.items with slice" {
    const slice = &[_]u32{ 1, 2, 3, 4, 5 };
    var sol = SliceOrList(u32).init(slice);
    try testing.expectEqualSlices(u32, slice, sol.items());
}

test "SliceOrList.items with ArrayList" {
    var list = ArrayList(u32).init(testing.allocator);
    defer list.deinit();
    try list.appendSlice(&[_]u32{ 1, 2, 3, 4, 5 });

    var sol = SliceOrList(u32).init(list);
    try testing.expectEqualSlices(u32, list.items, sol.items());
}

test "SliceOrList.canInit" {
    const slice = &[_]u32{ 1, 2, 3, 4, 5 };
    const list = ArrayList(u32).init(testing.allocator);
    defer list.deinit();

    // Valid cases
    try testing.expect(SliceOrList(u32).canInit(@TypeOf(slice)));
    try testing.expect(SliceOrList(u32).canInit(@TypeOf(list)));

    // Invalid cases
    try testing.expect(!SliceOrList(u32).canInit(@TypeOf("not a slice or list")));
    try testing.expect(!SliceOrList(u32).canInit(@TypeOf(12345)));
    try testing.expect(!SliceOrList(u32).canInit(@TypeOf(&[_]f32{ 1.0, 2.0 })));
}

// OLD TESTS

// test "Element.deinit" {
//     // TODO
// }

// test "Element.isAttributes" {
//     // TODO
// }

// test "Element.initAttributes" {
//     // TODO
// }

// test "Element.initContents" {
//     // TODO
// }

// test "Element.isComponent" {
//     // TODO
// }

// test "Element.render" {
//     // TODO
// }
