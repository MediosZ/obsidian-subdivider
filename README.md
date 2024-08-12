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