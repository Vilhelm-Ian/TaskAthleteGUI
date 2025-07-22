#!/usr/bin/env bash

set -euo pipefail

# Output file
output_file="combined.all"

# File extensions to process
extensions=("rs" "css" "tsx" "jsx" "js")

# Clear output file
> "$output_file"

# Find and process files using fd
fd -e "rs" -e "css" -e "tsx" -e "jsx" -e "js" \
   --exclude "$output_file" \
   --exclude "node_modules" \
   --exclude "target" \
   | while read -r file; do
    # Determine comment style based on file extension
    case "$file" in
        *.css)
            comment_prefix="/* "
            comment_suffix=" */"
            ;;
        *)
            comment_prefix="// "
            comment_suffix=""
            ;;
    esac

    # Get filename relative to current directory
    rel_path="${file#$(pwd)/}"

    # Add file header comment
    printf "%s%s%s\n" "$comment_prefix" "$rel_path" "$comment_suffix" >> "$output_file"
    
    # Append file content
    cat "$file" >> "$output_file"
    
    # Add separation newlines
    echo -e "\n" >> "$output_file"
done

echo "All files combined into $output_file"

