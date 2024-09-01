const std = @import("std");
const testing = std.testing;
const expectEqual = std.testing.expectEqual;
const expectEqualDeep = std.testing.expectEqualDeep;
const expect = std.testing.expect;
const meta = std.meta;
const builtin = std.builtin;
const print = std.debug.print;
const StringHashMap = std.StringHashMap;
const GeneralPurposeAllocator = std.heap.GeneralPurposeAllocator;


const Zhn = union (enum) {
    text: []const u8, 
    html: Html,
    // component: Component,

    pub const Html = struct {
        opening_tag: []const u8,
        closing_tag: []const u8,
        attributes: ?StringHashMap([]const u8) = null,
        // children: []const Zhn = &.{},
    };

    // pub const Component = struct {
    //     function: fn (Attrs, []*Zhn) Zhn,
    //     attrs: Attrs,
    //     children: []Zhn,
    // };

    pub const Attrs = struct {

    };

    pub fn parseAttributes(raw_attributes: anytype) !?StringHashMap([]const u8) {

        switch(@typeInfo(@TypeOf(raw_attributes))) {
            .Struct => |attr_info| {
                if (attr_info.fields.len == 0) return null;
                var gpa = GeneralPurposeAllocator(.{}){};
                const allocator = gpa.allocator();
                var attributes = StringHashMap([]const u8).init(allocator);
                inline for (attr_info.fields) |field| {
                    const value: []const u8 = @field(raw_attributes, field.name);
                    try attributes.put(field.name, value);
                }
                return attributes;
            },
            else => return error.ZhnAttributeParseError
        }    
    }

    pub fn parse(input: anytype) !Zhn {

        switch (@typeInfo(@TypeOf(input))) {
            .Pointer => |info| {
                const arr_info = @typeInfo(info.child);

                if (arr_info == .Array and arr_info.Array.child == u8) {
                    return Zhn{ .text = input };
                } else {
                    // @compileError("Expected string input");
                    return error.ZhnPointerParseError;
                } 
                return error.ZhnPointerParseError;
            },
            .Struct => |info| {
                if (!info.is_tuple) {
                    // @compileError("Expected tuple input");
                }
                if (info.fields.len != 4) {
                    // @compileError("Expected exactly 4 elements in tuple");
                }
                const opening_tag = input[0];
                const attributes = try parseAttributes(input[1]);
                // const children = input[2];
                const closing_tag = input[3];
                
                // if (opening_tag[0] != '<') @compileError("Opening tag must start with '<'");
                // if (opening_tag[opening_tag.len - 1] != '>') @compileError("Opening tag must end with '>'");
                // if (closing_tag[0] != '<' or closing_tag[1] != '/') @compileError("Closing tag must start with '</'");
                // if (closing_tag[closing_tag.len - 1] != '>') @compileError("Closing tag must end with '>'");
                return Zhn{ .html = .{
                    .opening_tag = opening_tag, 
                    .closing_tag = closing_tag,
                    .attributes = attributes,
                } };
            },
            else => {
                return error.ZhnParseError;
            }
        }

    }


};

test "parse text" {
    const input = "Hello, world";
    const actual = try Zhn.parse(input);
    const expected = Zhn{ .text = input };
    try expectEqualDeep(expected, actual);
}

test "parse HTML tag with no attributes or children" {
    const input = .{"<div>", .{}, .{}, "</div>"};
    const actual = try Zhn.parse(input);
    // const expected = Zhn{ .html = Zhn.Html{ .opening_tag = "<div>", .closing_tag = "</div>"}};
    try expect(std.mem.eql(u8, "<div>", actual.html.opening_tag));
    try expect(std.mem.eql(u8, "</div>", actual.html.closing_tag));
    try expectEqual(null, actual.html.attributes);
}

test "parse HTML tag with attributes but no children" {
    var opening_tag = "<div>";
    _ = &opening_tag;
    const input = .{opening_tag, .{ .class = "container", .style = "margin-top: 10px;" }, .{}, "</div>"};
    const actual = try Zhn.parse(input);
    try testing.expectEqualStrings("<div>", actual.html.opening_tag);
    try testing.expectEqualStrings("</div>", actual.html.closing_tag);
    try testing.expectEqualStrings("container", actual.html.attributes.?.get("class").?);
    try testing.expectEqualStrings("margin-top: 10px;", actual.html.attributes.?.get("style").?);
}


// test "parse HTML node with no attributes and a text child" {
//     const input = .{ "<div>", .{}, "Hello, world", "</div>" };
//     const expected = Zhn{ .html = Zhn.Html{
//         .tag = "div",
//         .attrs = .{},
//         .children = &.{ Zhn{ .text = "Hello, world" } }
//     }};
//     const actual = try Zhn.parse(input);
//     try expectEqual(expected.html, actual.html);
// }

