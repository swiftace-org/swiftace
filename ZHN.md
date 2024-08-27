# ZHN - Zig HTML Notation

ZHN, or Zig HTML Notation, is a concise and structured way to programmatically construct HTML using Zig. ZHN leverages Zig's anonymous struct syntax and comptime features to create a representation of HTML that is both readable and expressive. 


## ZHN syntax

A ZHN node can be of the following types:

1. Text: A string
2. HTML: An HTML tag
3. Component: A custom component


### Text Node

It's just a string:

```
const text_node = "Hello, world";
```


### HTML Node

An HTML node is typically a tuple with 4 elements:
1. The opening tag
2. An anonymous struct of attributes
3. A tuple of child nodes
4. The closing tag

Here's an example:

```zig 
const html_node = .{ "<div>", .{ .class = "container" }, .{ 
    .{ "<h1>", .{ .class = "heading" }, .{ 
        "ZHN - Zig HTML Notation" 
    }, "</h1>"},
    .{ "<p>", .{ .style = "margin-top: 16px;"}, .{ 
        "ZHN is a concise way to construct HTML in Zig."
    }, "</p>"}
}, "</div>" };
```

In the above example, the outer `<div>` node has a `class` atribute and contains two child nodes:

1. An `h1` node that has a `class` attribute and contains the text node `"ZHN - Zig HTML Notation"` as it's only child. 

2. A `p` node that has a `style` attribute and contains a text node `"ZHN is a concise way to construct HTML in Zig."` as its only child.


HTML nodes support the following variations and shorthands:

1. **Self-closing tags**: For self-closing tag without any children nodes, only the opening tag and attributes must be provided e.g. 

    ```zig
    const img_node = .{"<img>", .{ .src = "/image.png" }}`.
    ```

2. **Skip empty attributes**: If a tag has no attributes, the second element of the tuple can be skipped, e.g.

    ```zig
    const skip_attr_node = .{"<div>", .{
        .{"<h1>", .{ .class = "heading" }, .{ "ZHN" }, "</h1>"},
        .{"<p>", .{ "ZHN stands for Zig HTML Notation." }, "</p>"}
    }, "</div>"};
    ```

3. **Single-child**: If a node contains just one child, it can be passed directly, without wrapping it inside tuple, eg.

    ```zig
    const skip_attr_node = .{"<div>", .{
        .{"<h1>", "ZHN", "</h1>"},
        .{"<p>", "ZHN stands for Zig HTML Notation.", "</p>"}
    }, "</div>"};
    ```

4. **Skip empty children**: If a node has no children, the tuple of child nodes can be skipped entirely e.g.

    ```
    const skip_attr_node = .{"<div>", .{ .class = "loading_spinner" }, "</div>"};
    ```

Here's an example showing all the above rules in action:

```
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

```

It represents the following HTML page:

```html
<html lang="en">
 <head>
     <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Basic HTML Page</title>
</head>
<body>
    <h1>Welcome to my Basic HTML Page</h1>
    <p>This is a simple paragraph.</p>
    <ul>
        <li>Item 1</li>
        <li>Item 2</li>
        <li>Item 3</li>
    </ul>
</body>
</html>
```

A tuple representing an HTML node must contain at least one element and up to four elements. It is parsed as follows:

1. The first element must always be a string representing an opening tag.

2. If there

2. If the second element is a string, it represent a text node which the single child of the node. The tuple must contain exactly three elements, and the third element must be the appropriate closing tag.

3. If the second element is a tuple that can be parsed as a ZHN node, it represents the single child of the outer node. Again, the outer tuple must contain exactly three elements, and the third element must be the appropriate closing tag.

4. If the second element is a tuple, each of whose elements can be parsed as ZHN nodes, it represents the list of child nodes of the outer node. Once again, the outer tuple must contain exactly three elements, and the third element must be an approrpriate closing tag.

5. If the second element is an anonymous struct (but not a tuple), it represents the attributes for the tag. 

6. If the second element represents attributes, and the tuple contains exactly three elements, with the third element is the appropriate closing tag, then the node has no children.

7. If the tuple has exactly four children






### Component Nodes

TODO - Add information about component nodes

ZHN components are functions that accept two arguments:

1. An anonymous struct of attributes
2. A tuple of child nodes

Here's an example component:


