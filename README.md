# Subdivider

Subdivider is an efficient plugin for Obsidian that simplifies note organization. 
It converts your notes into nested folders, automatically creating separate files for each subheading. 

With Subdivider, you can easily navigate through your notes and manage large and complex information effortlessly. Take control of your note organization and enhance your productivity with Subdivider.

Personally, I don't like long notes, so when a note grows into a giant note, I would **subdivide** it into some smaller pieces.

This plugin is still in its early stage and if you find anything unexpected, feel free to open an issue.



## Usage

There are two operations right now, you can turn a file into a folder or turn part of a file into another file.

1. Right click a file and select "Subdivide the file", then a folder will be created.
2. Select some text in a file, right click and select "Subdivide the selection", then the file will be created.

# Notes

## Special Characters in File Name

The plugin will replace some special characters in the file name with `_` to avoid some unexpected issues. The special characters are:

- "/"
- "\\"
- " "(space)(Windows only)
- "."(period)(Windows only)

## File Structure

The plugin expects a well-structured file, which means the file should have a few Header 1s. Only these Header 1s will be converted into separate files during a single pass. 

[Linter](https://github.com/platers/obsidian-linter) is a great plugin to help you maintain a well-structured file.

### Example

Given the following file:

```markdown
Title
# Header 1
# Header 2
## Header 3
```

The plugin will convert it to:

```
- Title
  - Header 1.md
  - Header 2.md
```

If `recursive` is enabled, the plugin will also convert the Header 3 in `Header 2.md` to a separate file.

```markdown
- Title
  - Header 1.md
  - Header 2
    - Header 3.md
```

### Missing Headers

Note that Headers should be in order. If a Header 2 is missing, the plugin will not convert the Header 3 under it.

```markdown
Title
# Header 1
### Header 3
```

Even if `recursive` is enabled, the plugin will not convert the Header 3.


