const std = @import("std");
const print = std.debug.print;
const meta = std.meta;
const testing = std.testing;

pub fn main() void {
    const recv_buf: [4096]u8 = undefined;
    var idx = -1;
    _ = &idx;
    print("recv_buf.len: {}\n", .{recv_buf.len});
    print("recv_buf[0..100]: {}\n", .{recv_buf[@max(idx, 0)]});
}

// pub fn isString(comptime input: anytype) bool {
//     const str: []const u8 = "";
//     return @TypeOf(str, input) == []const u8;
// }

// test "check if something is a string" {
//     const str1 = "Hello, world";
//     print("type of str1: {}\n", .{@TypeOf(str1)});
//     try testing.expect(isString(str1));

//     const str2: *const [12]u8 = "Hello, world";
//     try testing.expect(isString(str2));

//     const str3: []const u8 = "Hello, world";
//     try testing.expect(isString(str3));
    
//     try testing.expect(!isString(23));
// }

// test "check string types equality" {
//     const x = "Hello, world";
//     print("type of x: {}", .{@TypeOf(x)});
//     try testing.expect(@TypeOf(x) == []const u8);
// }

test "iterability" {
    var list1 = std.ArrayList(u8).init(std.testing.allocator);
    try list1.append(1);
    try list1.append(2);
    try list1.append(3);
    try list1.append(4);
    try list1.append(5);
    defer list1.allocator.free(list1.allocatedSlice());

    try testing.expect(list1.items[1] == 2);
}