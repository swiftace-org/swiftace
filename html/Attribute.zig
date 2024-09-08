const std = @import("std");
const util = @import("./util.zig");
const mem = std.mem;
const Allocator = mem.Allocator;
const ArrayList = std.ArrayList;

const Attribute = @This();

const Value = union(enum) {
    text: []const u8,
    present: bool
};

name: []const u8,
value: Value,

pub fn initAll(allocator: Allocator, raw_attrs: anytype) ![]const Attribute {
    const input_type: type = @TypeOf(raw_attrs);
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

pub fn initMap(allocator: Allocator, attr_map: anytype) ![]const Attribute {
    const keys = attr_map.keys();
    var attributes = try allocator.alloc(Attribute, keys.len);
    errdefer allocator.free(attributes);
    for (keys, 0..) |key, i| {
        attributes[i] = Attribute{
            .name = key,
            .value = .{ .text = attr_map.get(key).? }
        };
    }
    return attributes;
}

pub fn deinitAll(allocator: Allocator, attributes: []const Attribute) void {
    return allocator.free(attributes);
}

pub fn isValidName(name: []const u8) bool {
    if (name.len == 0) return false;
    for (name) |char| {
        switch (char) {
            0x00...0x1F, // Control characters
            0x20,        // Space
            0x22,        // "
            0x27,        // '
            0x3E,        // >
            0x2F,        // /
            0x3D,        // =
            => return false,
            else => {},
        }
    }
    return true;
}


pub fn render(self: Attribute, result: *ArrayList(u8)) !void {
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
        .present => |present|{
            if (present) try result.appendSlice(self.name);
        },
    }
}

pub fn renderAll(attributes: []const Attribute, result: *ArrayList(u8)) !void {
    for (attributes) |attribute| {
        if (attribute.value == .present and !attribute.value.present) continue;
        try result.append(' ');
        try attribute.render(result);
    }
}

const testing = std.testing;
const expect = std.testing.expect;
const expectEqualDeep = testing.expectEqualDeep;
const expectError = testing.expectError;

test initAll {
    const alloc = testing.allocator;

    // Empty struct should return an empty slice
    const expected1 = &.{};
    const actual1 = try initAll(alloc, .{});
    defer deinitAll(alloc, actual1);
    try expectEqualDeep(expected1, actual1);

    // Struct containing one text field
    const expected2: []const Attribute = &.{ .{ .name = "class", .value = Value{ .text = "container" } } };
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
    const expected3: []const Attribute = &.{
        .{ .name = "string_field", .value = .{ .text = "hello" } },
        .{ .name = "another_string_field", .value = .{ .text = "world" } },
        .{ .name = "empty_string", .value = .{ .text = "" } },
        .{ .name = "boolean_present", .value = .{ .present = true } },
        .{ .name = "boolean_absent", .value = .{ .present = false } }
    };
    const actual3 = try initAll(alloc, input3);
    defer deinitAll(alloc, actual3);
    try expectEqualDeep(expected3, actual3);

    // Struct containing attribute names with special characters
    const input4 = .{
        .@"with:colon" = "colon value",
        .@"with_underscore" = "underscore value",
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
        .{ .name = "simple", .value = .{.text = "hello" } },
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

    // Struct containing illegal attribute name leads to an error
    const err = error.HtmlParseError;
    try expectError(err, initAll(alloc, .{ .@"illegal name" = "hello"}));
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

// test render {
//     // const alloc = testing.allocator;
//     var map1 = std.StringArrayHashMap([]const u8).init(testing.allocator);
//     defer map1.deinit();
//     try map1.put("class", "container");
//     try map1.put("style", "margin-top: 10px;");
//     map1.keys();
//     const actual1 = try initFromMap(testing.allocator, map1);
//     defer deinitAll(testing.allocator, actual1);
//     var result = std.ArrayList(u8).init(testing.allocator);
//     defer result.deinit();
//     try Attribute.renderAll(actual1, &result);
//     std.debug.print("output: {s}\n", .{result.items});
// }