// TODO:
// - [x] Create a "Hello World" web server
// - [x] Change the output to valid HTML
// - [ ] Decide Zig-struct representation of HTML
// - [ ] Create HTML render using comptime utilities
// - [ ] Write some tests for HTML renderer
// - [ ] Serve rendered HTML from server
// - [ ] Add routing to server
// - [ ] Deploy server to Hetzner
// - [ ] Figure out how to make HTTPS work
// - [ ] Make the IP and port configurable

const std = @import("std");
const net = std.net;
const mem = std.mem;
const print = std.debug.print;
const expect = std.testing.expect;
const expectEqualStrings = std.testing.expectEqualStrings;
const ArrayList = std.ArrayList;

pub fn main() !void {
    print("Starting server\n", .{});
    const address = try net.Address.resolveIp("0.0.0.0", 8080);
    var listener = try address.listen(.{ .reuse_address = true });
    print("Listening on {}\n", .{address});

    while (listener.accept()) |connection| {
        print("Accepted connection from: {}\n", .{connection.address});
        var recv_buf: [4096]u8 = undefined; // Why this 4096? Should it be dyamic? This is wrong
        var recv_total: usize = 0;

        while (connection.stream.read(recv_buf[recv_total..])) |recv_len| {
            if (recv_len == 0) break;
            recv_total += recv_len;
            // Seems like the following check can be optimized
            if (mem.containsAtLeast(u8, recv_buf[0..recv_total], 1, "\r\n\r\n")) {
                break;
            }
        } else |read_err| {
            print("Error in read", .{});
            return read_err;
        }

        const recv_data = recv_buf[0..recv_total];
        if (recv_data.len == 0) {
            print("Got connection but no header!\n", .{});
            continue;
        }

        // TODO - parse header

        // TODO - parse route (pathname)

        print("SENDING----\n", .{});
        const httpHead =
            "HTTP/1.1 200 OK \r\n" ++
            "Connection: close\r\n" ++
            "Content-Type: text/html; charset=utf-8\r\n" ++
            "Content-Length: {}\r\n" ++
            "\r\n";
        const htmlPage =
            \\<!DOCTYPE html>
            \\<html lang="en">
            \\<head>
            \\    <meta charset="UTF-8">
            \\    <meta name="viewport" content="width=device-width, initial-scale=1.0">
            \\    <title>Basic HTML Page</title>
            \\</head>
            \\<body>
            \\    <h1>Welcome to my Basic HTML Page</h1>
            \\    <p>This is a simple paragraph.</p>
            \\    <ul>
            \\        <li>Item 1</li>
            \\        <li>Item 2</li>
            \\        <li>Item 3</li>
            \\    </ul>
            \\</body>
            \\</html>
        ;
        _ = try connection.stream.writer().print(httpHead, .{htmlPage.len});
        _ = try connection.stream.writer().write(htmlPage);
        print("SENT----\n", .{});
    } else |err| {
        print("Error in accept", .{});
        return err;
    }
}

const htmlPage2 =
    \\<!DOCTYPE html>
    \\<html lang="en">
    \\<head>
    \\    <meta charset="UTF-8">
    \\    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    \\    <title>Basic HTML Page</title>
    \\</head>
    \\<body>
    \\    <h1>Welcome to my Basic HTML Page</h1>
    \\    <p>This is a simple paragraph.</p>
    \\    <ul>
    \\        <li>Item 1</li>
    \\        <li>Item 2</li>
    \\        <li>Item 3</li>
    \\    </ul>
    \\</body>
    \\</html>
;

const H = struct {
    const html = struct {};
    const body = struct {};
    const head = struct {};
    const meta = struct {};
    const title = struct {};
};

const root0 = H.html{
    .attr = .{ .lang = "en" },
    .body = .{
        H.head{ .body = .{
            H.meta{ .attr = .{ .charset = "UTF-8" } },
            H.meta{ .attr = .{ .name = "viewport", .content = "width=device-width, initial-scale=1.0" } },
            H.title{ .body = "Basic HTML Page" },
        } },
        H.body{},
    },
};

const root2 = H.html(.{ .lang = "en" }){
    H.head(.{}){ H.meta(.{ .charset = "UTF-8" }){}, H.meta(.{}){} },
    H.body(){},
};


const root = .{ "<html>", .{ .lang = "en" }, .{
    .{ "<head>", .{ 
        .{ "<meta>", .{ .charset = "UTF-8" } }, 
        .{ "<meta>", .{ .name = "viewport", .content = "width=device-width, initial-scale=1.0" } }, 
        .{ "<title>", "Basic HTML Page", "</title>" } 
    }, "</head>" },
    .{ "<body>", .{
        .{ "<h1>", "Welcome to my Basic HTML Page", "</h1>" },
        .{ "<p>", "This is a simple paragraph", "</p>" },
        .{ "<ul>", .{
            .{ "<li>", "Item 1", "</li>" },
            .{ "<li>", "Item 2", "</li>" },
            .{ "<li>", "Item 3", "</li>" },
        }, "</ul>" },
    }, "</body>" },
}, "</html>" };

pub fn renderHtml(element: anytype) []const u8 {
    const result = ArrayList(u8).init(std.heap.page_allocator);
    _ = &result;
    return element[0];
}

test "renderHtml renders a single self-closing tag" {
    const element = .{"<br>"};
    try expectEqualStrings("<br>", renderHtml(element));
}

test "renderHtml renders a self-closing tag with attributes" {
    const element = .{ "<meta>", .{ .name = "viewport", .content = "width=device-width, initial-scale=1.0" } };
    const expected = "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">";
    try expectEqualStrings(expected, renderHtml(element));
}


const html_node = .{ "<div>", .{ .class = "container" }, .{ 
    .{ "<h1>", .{ .class = "heading" }, .{ 
        "ZHN - Zig HTML Notation" 
    }, "</h1>"},
    .{ "<p>", .{ .class = "text"}, .{ 
        "ZHN is a concise way to construct HTML in Zig."
    }, "</p>"}
}, "</div>" };


const skip_attr_node = .{"<div>", .{
    .{"<h1>", .{ .class = "heading" }, .{ "ZHN" }, "</h1>"},
    .{"<p>", .{ "ZHN stands for Zig HTML Notation." }, "</p>"}
}, "</div>"};