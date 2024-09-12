const std = @import("std");
const util = @import("./html/util.zig");

// const Element = union(enum) {
//     nil: void,
//     raw: []const u8,
//     tag: Tag,

//     pub fn init(input: anytype) Element {
//         if (comptime util.isZigString(@TypeOf(input))) return .{ .raw = input };
//         return .{ .tag = Tag.init(input) };
//     }
// };

// const Tag = struct {
//     name: []const u8,
//     contents: *const Element = &.nil,

//     pub fn init(input: anytype) Tag {
//         const name = input[0];
//         const element = Element.init(input[1]);
//         return .{ .name = name, .contents = &element };
//     }
// };

// const testing = std.testing;

// test "check segmentation fault" {
//     const input = .{"div", "Hello, world"};
//     const expected = Element{ 
//         .tag = .{ 
//             .name = "div", 
//             .contents = &.{ .raw = "Hello, world" } 
//         } 
//     };
//     const actual = Element.init(input);
//     // try testing.expectEqualStrings("<div>", actual.tag.name);
//     try testing.expectEqualDeep(expected, actual);
// }

// const root = Element.init(testing.allocator,
//     .{ "<html>", .{ .lang = "en" }, .{
//         .{ "<head>", .{
//             .{ "<title>", "My Application", "</title>" },
//         }, "</head>"},
//         .{"<body>", .{
//             .{"<div>", "Hello, world", "</div>"},
//         }, "</body>"},
//     }, "</html>" }
// );


// const RootLayout = struct {};
// const MainNav = struct {};

// const root2 = Element.init(testing.allocator, 
//     .{ "<html>", .{ .lang = "en" }, .{
//         .{ "<head>", .{
//             .{ "<title>", "My Application", "</title>" },
//         }, "</head>"},
//         .{"<body>", .{
//             .{"<div>", "Hello, world", "</div>"},
//             RootLayout{
//                 .title = "My Application",
//                 .children = MainNav{
//                     .logo = "/logo.png",
//                 }
//             }
//         }, "</body>"},
//     }, "</html>" },
// );

// const root3 = Element.init(testing.allocator, 
//     .{ "<html>", .{ .lang = "en" }, .{
//         .{ "<head>", .{
//             .{ "<title>", "My Application", "</title>" },
//         }, "</head>"},
//         .{"<body>", .{
//             .{"<div>", "Hello, world", "</div>"},
//             .{RootLayout, .{ .title = "My Application" }, 
//                 .{MainNav, .{.logo = "/logo.png"}}
//             },
//         }, "</body>"},
//     }, "</html>" },
// );

// test "sample" {
//     const x: []const u8 = &.{ 80, 97, 103, 101, 32, 84, 105, 116, 108, 101 };
//     std.debug.print("x: {s}\n", .{x});
//     const y: []const u8 = &.{ 72, 101, 108, 108, 111, 44, 32, 119, 111, 114, 108, 100 };
//     std.debug.print("y: {s}\n", .{y});
// }

// test "comptime types" {
//     const h = "Hello, world";
//     std.debug.print("type of h: {}\n", .{@TypeOf(h)});

// }

// fn isComptimeString(comptime str: []const u8) bool {
//     return @TypeOf(str) == *const [str.len:0]u8;
// }

// pub fn main() void {
//     const compile_time_str = "Hello, World!";
//     var runtime_str = "Hello, World!";
//     _ = &runtime_str;

//     std.debug.print("Is compile_time_str comptime? {}\n", .{isComptimeString(compile_time_str)});
//     std.debug.print("Is runtime_str comptime? {}\n", .{isComptimeString(runtime_str)});
// }

// pub fn max(x: u32, y: u32) !u32 {
//     return if (x > y) x else y;
// }

// test "type of null" {
//     std.debug.print("type of null: {}\n", .{@TypeOf(null)});
//     const m = max(2, 3);
//     std.debug.print("type of m: {}\n", .{@TypeOf(m)});
//     try std.testing.expectEqual(3, m);
// }

pub fn ownedSlice(allocator: std.mem.Allocator, data: []const u8) ![]const u8 {
    var list = std.ArrayList(u8).init(allocator);
    try list.appendSlice(data);
    defer list.deinit();
    return list.items;
}

test "check defer after return" {
    const outcome = try ownedSlice(std.testing.allocator, "Hello, world");
    defer testing.allocator.free()
    std.debug.print("outcome: {s}\n", .{outcome});
}