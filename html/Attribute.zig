const std = @import("std");
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

// TODO: Add support for string hash maps
// TODO: Should this be replaced with a hashmap instead (?)

pub fn initAll(allocator: Allocator, attr_struct: anytype) ![]const Attribute {
    const input_type: type = @TypeOf(attr_struct);
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
        const value = @field(attr_struct, name);
        attributes[i] = Attribute{
            .name = name,
            .value = if (@TypeOf(value) == bool) .{ .present = value } else .{ .text = value },
        };
    }
    return attributes;
}

pub fn deinitAll(allocator: Allocator, attributes: []const Attribute) void {
    return allocator.free(attributes);
}

pub fn isValidName(name: []const u8) bool {
    if (name.len == 0) return false;
    for (name, 0..) |char, i| {
        if (i == 0) {
            if (!std.ascii.isAlphabetic(char) and 
                char != ':' and char != '_') return false;
        } else {
            if (!std.ascii.isAlphabetic(char) and 
                !std.ascii.isDigit(char) and
                char != ':' and char != '_' and 
                char != '-' and char != '.') return false;
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
    try expectError(err, initAll(alloc, .{ .@"illegal name" = "with space"}));
    try expectError(err, initAll(alloc, .{ .@"1invalid" = "with number" }));
    try expectError(err, initAll(alloc, .{ .@"invalid@" = "at symbol" }));
    try expectError(err, initAll(alloc, .{ .@"invalid#" = "hash symbol" }));
    try expectError(err, initAll(alloc, .{ .@"invalid$" = "dollar sign" }));
    try expectError(err, initAll(alloc, .{ .@"invalid%" = "percent sign" }));
    try expectError(err, initAll(alloc, .{ .@"invalid^" = "caret" }));
    try expectError(err, initAll(alloc, .{ .@"invalid&" = "ampersand" }));
    try expectError(err, initAll(alloc, .{ .@"invalid*" = "asterisk" }));
    try expectError(err, initAll(alloc, .{ .@"invalid(" = "opening parenthesis" }));
    try expectError(err, initAll(alloc, .{ .@"invalid+" = "plus sign" }));
    try expectError(err, initAll(alloc, .{ .@"invalid=" = "equals sign" }));
    try expectError(err, initAll(alloc, .{ .@"invalid," = "comma" }));
    try expectError(err, initAll(alloc, .{ .@"invalid<" = "less than" }));
    try expectError(err, initAll(alloc, .{ .@"invalid>" = "greater than" }));
    try expectError(err, initAll(alloc, .{ .@"invalid/" = "forward slash" }));
    try expectError(err, initAll(alloc, .{ .@"invalid?" = "question mark" }));
    try expectError(err, initAll(alloc, .{ .@"invalid`" = "backtick" }));
    try expectError(err, initAll(alloc, .{ .@"invalid~" = "tilde" }));
    try expectError(err, initAll(alloc, .{ .@"invalid[" = "opening square bracket" }));
    try expectError(err, initAll(alloc, .{ .@"invalid{" = "opening curly brace" }));
    try expectError(err, initAll(alloc, .{ .@"invalid|" = "vertical bar" }));
    try expectError(err, initAll(alloc, .{ .@"invalid\\" = "backslash" }));
    try expectError(err, initAll(alloc, .{ .@"invalid€" = "euro sign" }));
    try expectError(err, initAll(alloc, .{ .@"almost:valid_but_invalid!" = "mixed" }));

    
    // Passing in a errresults in compilation error
    // Uncomment the following to fail compilation
    // try initAll(testing.allocator, .{ 1, 2, 3, 4 });
    // try initAll(testing.allocator, 34);
}