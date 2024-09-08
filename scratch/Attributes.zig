const std = @import("std");
const util = @import("./util.zig");
const mem = std.mem;

items: std.StringArrayHashMap(Value),

const Attributes = @This();

const Value = union(enum) {
    text: []const u8,
    present: bool
};

pub fn init(allocator: mem.Allocator) !Attributes {
    return .{ .items = std.StringArrayHashMap(Value).init(allocator) };
}

pub fn initFromStruct(allocator: mem.Allocator, attr_struct: anytype) !Attributes {
    const input_type: type = @TypeOf(attr_struct);
    const info = @typeInfo(input_type);
    if (info != .Struct) @compileError("Expected non-tuple struct. Received: " ++ @typeName(input_type));

    var items = std.StringArrayHashMap(Value).init(allocator);
    errdefer items.deinit();

    const fields = info.Struct.fields;
    if (fields.len == 0) return .{ .items = items };
    if (info.Struct.is_tuple) @compileError("Expected non-tuple struct. Received: " ++ @typeName(input_type));
    
    inline for (fields) |field| {
        const name = field.name;
        if (!isValidName(name)) return error.HtmlParseError;
        const raw_val = @field(attr_struct, name);
        const value = if (@TypeOf(raw_val) == bool) .{ .present = raw_val } else .{ .text = raw_val };
        try items.put(name, value);
    }
    
    return .{ .items = items };
}

pub fn deinit(self: *Attributes) void {
    self.items.deinit();
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

pub fn render(self: Attributes, result: anytype) !void {
    for (self.items.keys(), self.items.values()) |key, value| {
        switch (value) {
            .text => |text| {
                try result.appendSlice(key);
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
                if (present) try result.appendSlice(key);
            },
        }    
    }
}

const testing = std.testing;
const expect = std.testing.expect;
const expectEqualDeep = testing.expectEqualDeep;
const expectError = testing.expectError;

test initFromStruct {
    const alloc = testing.allocator;

    // Empty struct should return an empty slice
    var expected1 = try init(alloc);
    defer expected1.deinit();
    var actual1 = try initFromStruct(alloc, .{});
    defer actual1.deinit();
    try expectEqualDeep(expected1, actual1);

    // Struct containing one text field
    var expected2 = try init(alloc);
    defer expected2.deinit();
    try expected2.items.put("class", .{ .text = "container" });
    var actual2 = try initFromStruct(alloc, .{ .class = "container" });
    defer actual2.deinit();
    try expectEqualDeep(expected2, actual2);

}