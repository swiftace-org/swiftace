const std = @import("std");
const tst = std.testing;
const mem = std.mem;
const Allocator = mem.Allocator;

const Attribute = struct {
    name: []const u8,
    value: ?[]const u8,

    pub fn parseAll(allocator: Allocator, input: anytype) ![]const Attribute {
        const input_type = @TypeOf(input);
        const info = @typeInfo(input_type);
        const fields = info.Struct.fields;

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



test "parsing anonymous structs into their components" {
    const input = .{ .class = "hello", .style = "world"};
    const attributes = try Attribute.parseAll(tst.allocator, input);
    defer tst.allocator.free(attributes);
    std.debug.print("attrs1[0].name: {s}\n", .{attributes[0].name});
    try tst.expectEqual("class", attributes[0].name);
}