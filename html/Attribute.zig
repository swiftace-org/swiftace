//! Struct for representing HTML attributes

const std = @import("std");
const util = @import("./util.zig");
const mem = std.mem;
const Allocator = mem.Allocator;
const ArrayList = std.ArrayList;

const Attribute = @This();

const Value = union(enum) { 
    text: []const u8, 
    present: bool,
};

const Error = Allocator.Error || error{HtmlParseError};

name: []const u8,
value: Value,

/// Convert a raw struct of attributes (text or boolean) into a slice of `Attribute`s.
/// If an existing slice of attributes is supplied as input, it creates a copy.
pub fn initAll(allocator: Allocator, raw_attrs: anytype) Error![]const Attribute {
    const input_type: type = @TypeOf(raw_attrs);
    if (comptime util.isSliceOf(input_type, Attribute)) {
        var attributes = try allocator.alloc(Attribute, raw_attrs.len);
        for (raw_attrs,0..) |attr,i| attributes[i] = attr;
        return attributes;
    }

    const info = @typeInfo(input_type);
    if (info != .Struct) @compileError("Expected non-tuple struct. Received: " ++ @typeName(input_type));
    const fields = info.Struct.fields;
    if (fields.len == 0) return &.{};
    if (info.Struct.is_tuple) @compileError("Expected non-tuple struct. Received: " ++ @typeName(input_type));

    var attributes = try allocator.alloc(Attribute, fields.len);
    errdefer allocator.free(attributes);
    inline for (fields, 0..) |field, i| {
        const name = field.name;
        if (!isValidName(name)) return error.HtmlParseError;
        const value = @field(raw_attrs, name);
        attributes[i] = Attribute{
            .name = name,
            .value = if (@TypeOf(value) == bool) .{ .present = value } else .{ .text = value },
        };
    }
    return attributes;
}

/// Check if the argument can be passed as an input to `initAll`
pub fn canInitAll(input_type: type) bool {
    if (comptime util.isSliceOf(input_type, Attribute)) return true;
    const info = @typeInfo(input_type);
    if (info != .Struct) return false;
    if (info.Struct.fields.len > 0 and info.Struct.is_tuple) return false;
    return true;
}

/// Free the memory allocated for a slice of `Attribute`s.
pub fn deinitAll(allocator: Allocator, attributes: []const Attribute) void {
    return allocator.free(attributes);
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

/// Render a single `Attribute` into its HTML string representation.
pub fn render(self: Attribute, result: *ArrayList(u8)) Allocator.Error!void {
    switch (self.value) {
        .text => |text| {
            try result.appendSlice(self.name);
            try result.append('=');
            try result.append('"');
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
            try result.append('"');
        },
        .present => |present| {
            if (present) try result.appendSlice(self.name);
        },
    }
}

/// Render a slice of `Attribute`s into its HTML string representation.
/// Escape special characters in values and include a space before each attribute name.
pub fn renderAll(attributes: []const Attribute, result: *ArrayList(u8)) Allocator.Error!void {
    for (attributes) |attribute| {
        if (attribute.value == .present and !attribute.value.present) continue;
        try result.append(' ');
        try attribute.render(result);
    }
}

const testing = std.testing;
const expect = std.testing.expect;
const expectEqualDeep = testing.expectEqualDeep;
const expectEqualStrings = testing.expectEqualStrings;
const expectError = testing.expectError;

test initAll {
    const alloc = testing.allocator;

    // Empty struct should return an empty slice
    const expected1 = &.{};
    const actual1 = try initAll(alloc, .{});
    defer deinitAll(alloc, actual1);
    try expectEqualDeep(expected1, actual1);

    // Struct containing one text field
    const expected2: []const Attribute = &.{.{ .name = "class", .value = Value{ .text = "container" } }};
    const actual2 = try initAll(alloc, .{ .class = "container" });
    defer deinitAll(alloc, actual2);
    try expectEqualDeep(expected2, actual2);

    // Struct containing multiple fields (text and boolean)
    const input3 = .{
        .string_field = "hello",
        .another_string_field = "world",
        .empty_string = "",
        .boolean_present = true,
        .boolean_absent = false,
    };
    const expected3: []const Attribute = &.{ .{ .name = "string_field", .value = .{ .text = "hello" } }, .{ .name = "another_string_field", .value = .{ .text = "world" } }, .{ .name = "empty_string", .value = .{ .text = "" } }, .{ .name = "boolean_present", .value = .{ .present = true } }, .{ .name = "boolean_absent", .value = .{ .present = false } } };
    const actual3 = try initAll(alloc, input3);
    defer deinitAll(alloc, actual3);
    try expectEqualDeep(expected3, actual3);

    // Struct containing attribute names with special characters
    const input4 = .{
        .@"with:colon" = "colon value",
        .with_underscore = "underscore value",
        .@"with-hyphen" = "hyphen value",
        .@"with.dot" = "dot value",
        .@"mixed:_-." = true,
    };
    const expected4: []const Attribute = &.{
        .{ .name = "with:colon", .value = .{ .text = "colon value" } },
        .{ .name = "with_underscore", .value = .{ .text = "underscore value" } },
        .{ .name = "with-hyphen", .value = .{ .text = "hyphen value" } },
        .{ .name = "with.dot", .value = .{ .text = "dot value" } },
        .{ .name = "mixed:_-.", .value = .{ .present = true } },
    };
    const actual4 = try initAll(alloc, input4);
    defer deinitAll(alloc, actual4);
    try expectEqualDeep(expected4, actual4);

    // Struct containing attribute values with special characters
    const input5 = .{
        .simple = "hello",
        .with_quotes = "He said \"hello\"",
        .with_ampersand = "Tom & Jerry",
        .with_less_than = "a < b",
        .with_greater_than = "x > y",
        .with_single_quote = "It's me",
        .mixed = "a < b & c > d \"quote\" 'apostrophe'",
    };
    const expected5: []const Attribute = &.{
        .{ .name = "simple", .value = .{ .text = "hello" } },
        .{ .name = "with_quotes", .value = .{ .text = "He said \"hello\"" } },
        .{ .name = "with_ampersand", .value = .{ .text = "Tom & Jerry" } },
        .{ .name = "with_less_than", .value = .{ .text = "a < b" } },
        .{ .name = "with_greater_than", .value = .{ .text = "x > y" } },
        .{ .name = "with_single_quote", .value = .{ .text = "It's me" } },
        .{ .name = "mixed", .value = .{ .text = "a < b & c > d \"quote\" 'apostrophe'" } },
    };
    const actual5 = try initAll(alloc, input5);
    defer deinitAll(alloc, actual5);
    try expectEqualDeep(expected5, actual5);

    // Passing a slice of attributes returns a copy of the slice
    const expected6 = expected5;
    const actual6 = try initAll(alloc, expected6);
    defer deinitAll(alloc, actual6);
    try expectEqualDeep(expected6, actual6);

    // Struct containing illegal attribute name leads to an error
    const err = error.HtmlParseError;
    try expectError(err, initAll(alloc, .{ .@"illegal name" = "hello" }));
    try expectError(err, initAll(alloc, .{ .@"invalid\"name" = "hello" }));
    try expectError(err, initAll(alloc, .{ .@"invalid'name" = "at symbol" }));
    try expectError(err, initAll(alloc, .{ .@"invalid>name" = "hash symbol" }));
    try expectError(err, initAll(alloc, .{ .@"invalid/name" = "dollar sign" }));
    try expectError(err, initAll(alloc, .{ .@"invalid=name" = "percent sign" }));

    // Passing in a errresults in compilation error
    // Uncomment the following to fail compilation
    // try initAll(testing.allocator, .{ 1, 2, 3, 4 });
    // try initAll(testing.allocator, 34);
}

test isValidName {
    try expect(isValidName("valid-name"));
    try expect(isValidName("valid_name"));
    try expect(isValidName("validName123"));
    try expect(isValidName("!@#$%^&*()"));
    try expect(!isValidName(""));
    try expect(!isValidName(" invalid"));
    try expect(!isValidName("invalid\"name"));
    try expect(!isValidName("invalid'name"));
    try expect(!isValidName("invalid>name"));
    try expect(!isValidName("invalid/name"));
    try expect(!isValidName("invalid=name"));
}

test render {
    const alloc = testing.allocator;
    var result = ArrayList(u8).init(alloc);
    defer result.deinit();

    // Render a text attribute
    const attr1 = Attribute{ .name = "class", .value = .{ .text = "container" } };
    try attr1.render(&result);
    try expectEqualStrings("class=\"container\"", result.items);
    result.clearRetainingCapacity();

    // Render a present boolean attribute
    const attr2 = Attribute{ .name = "disabled", .value = .{ .present = true } };
    try attr2.render(&result);
    try expectEqualStrings("disabled", result.items);
    result.clearRetainingCapacity();

    // Render an absent boolean attribute
    const attr3 = Attribute{ .name = "checked", .value = .{ .present = false } };
    try attr3.render(&result);
    try expectEqualStrings("", result.items);
    result.clearRetainingCapacity();

    // Render a text attribute with special characters
    const attr4 = Attribute{ .name = "data", .value = .{ .text = "a < b & c > d \"quote\" 'apostrophe'" } };
    try attr4.render(&result);
    try expectEqualStrings("data=\"a &lt; b &amp; c &gt; d &quot;quote&quot; &#39;apostrophe&#39;\"", result.items);
    result.clearRetainingCapacity();
}

test renderAll {
    const alloc = testing.allocator;
    var result = ArrayList(u8).init(alloc);
    defer result.deinit();

    // Render an empty struct
    const empty_attrs = try initAll(alloc, .{});
    defer deinitAll(alloc, empty_attrs);
    try renderAll(empty_attrs, &result);
    try expectEqualStrings("", result.items);
    result.clearRetainingCapacity();

    // Render a single text attribute
    const single_attr = try initAll(alloc, .{ .class = "container" });
    defer deinitAll(alloc, single_attr);
    try renderAll(single_attr, &result);
    try expectEqualStrings(" class=\"container\"", result.items);
    result.clearRetainingCapacity();

    // Test with multiple attributes of different types
    const multi_attrs = try initAll(alloc, .{
        .id = "main",
        .disabled = true,
        .checked = false,
        .@"data-value" = "10 < 20 & \"quote\"",
    });
    defer deinitAll(alloc, multi_attrs);
    try renderAll(multi_attrs, &result);
    try expectEqualStrings(" id=\"main\" disabled data-value=\"10 &lt; 20 &amp; &quot;quote&quot;\"", result.items);
    result.clearRetainingCapacity();

    // Test with attributes containing special characters in names
    const special_attrs = try initAll(alloc, .{
        .@"data:custom" = "value",
        .@"aria-label" = "Description",
    });
    defer deinitAll(alloc, special_attrs);
    try renderAll(special_attrs, &result);
    try expectEqualStrings(" data:custom=\"value\" aria-label=\"Description\"", result.items);
    result.clearRetainingCapacity();
}