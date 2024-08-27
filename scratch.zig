const std = @import("std");
const print = std.debug.print;

pub fn main() void {
    const recv_buf: [4096]u8 = undefined;
    var idx = -1;
    _ = &idx;
    print("recv_buf.len: {}\n", .{recv_buf.len});
    print("recv_buf[0..100]: {}\n", .{recv_buf[@max(idx, 0)]});
}