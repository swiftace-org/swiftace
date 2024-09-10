const std = @import("std");
const util = @import("./html/util.zig");

const Element = union(enum) {
    nil: void,
    raw: []const u8,
    tag: Tag,

    pub fn init(input: anytype) Element {
        if (comptime util.isZigString(@TypeOf(input))) return .{ .raw = input };
        return .{ .tag = Tag.init(input) };
    }
};

const Tag = struct {
    name: []const u8,
    contents: *const Element = &.nil,

    pub fn init(input: anytype) Tag {
        const name = input[0];
        const element = Element.init(input[1]);
        return .{ .name = name, .contents = &element };
    }
};

const testing = std.testing;

test "check segmentation fault" {
    const input = .{"div", "Hello, world"};
    const expected = Element{ 
        .tag = .{ 
            .name = "div", 
            .contents = &.{ .raw = "Hello, world" } 
        } 
    };
    const actual = Element.init(input);
    // try testing.expectEqualStrings("<div>", actual.tag.name);
    try testing.expectEqualDeep(expected, actual);
}

const root = Element.init(testing.allocator,
    .{ "<html>", .{ .lang = "en" }, .{
        .{ "<head>", .{
            .{ "<title>", "My Application", "</title>" },
        }, "</head>"},
        .{"<body>", .{
            .{"<div>", "Hello, world", "</div>"},
        }, "</body>"},
    }, "</html>" }
);


const RootLayout = struct {};
const MainNav = struct {};

const root2 = Element.init(testing.allocator, 
    .{ "<html>", .{ .lang = "en" }, .{
        .{ "<head>", .{
            .{ "<title>", "My Application", "</title>" },
        }, "</head>"},
        .{"<body>", .{
            .{"<div>", "Hello, world", "</div>"},
            RootLayout{
                .title = "My Application",
                .children = MainNav{
                    .logo = "/logo.png",
                }
            }
        }, "</body>"},
    }, "</html>" },
);

const root3 = Element.init(testing.allocator, 
    .{ "<html>", .{ .lang = "en" }, .{
        .{ "<head>", .{
            .{ "<title>", "My Application", "</title>" },
        }, "</head>"},
        .{"<body>", .{
            .{"<div>", "Hello, world", "</div>"},
            .{RootLayout, .{ .title = "My Application" }, 
                .{MainNav, .{.logo = "/logo.png"}}
            },
        }, "</body>"},
    }, "</html>" },
);

test "sample" {
    const x: []const u8 = &.{ 80, 97, 103, 101, 32, 84, 105, 116, 108, 101 };
    std.debug.print("x: {s}\n", .{x});
    const y: []const u8 = &.{ 72, 101, 108, 108, 111, 44, 32, 119, 111, 114, 108, 100 };
    std.debug.print("y: {s}\n", .{y});
}