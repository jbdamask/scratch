#!/bin/bash

# Extract Name, Date, Billable Hours, and Activities (with URLs removed) from CSV
# This version properly handles quoted CSV fields with embedded commas
# Usage: ./extract_worklog.sh input.csv

if [ $# -eq 0 ]; then
    echo "Usage: $0 <csv_file>"
    exit 1
fi

INPUT_FILE="$1"

# Use Python for proper CSV parsing since the CSV has inconsistent quoting
python3 -c "
import csv
import re
import sys

def clean_activities(text):
    if not text:
        return ''
    # Remove URLs with surrounding parentheses
    text = re.sub(r'\(https?://[^)]*\)', '', text)
    # Clean up extra spaces and commas
    text = re.sub(r',\s*,', ',', text)  # Remove empty entries between commas
    text = re.sub(r',\s*$', '', text)   # Remove trailing comma and space
    text = re.sub(r'^\s*,', '', text)   # Remove leading comma and space
    text = re.sub(r'\s+', ' ', text)    # Normalize multiple spaces
    return text.strip()

try:
    with open('$INPUT_FILE', 'r', encoding='utf-8') as csvfile:
        # Try different CSV dialects to handle the inconsistent format
        sample = csvfile.read(1024)
        csvfile.seek(0)
        
        reader = csv.reader(csvfile)
        
        # Print header
        print('Name,Date,Billable Hours,Activities')
        
        # Skip header row
        next(reader)
        
        for row in reader:
            if len(row) >= 6:  # Ensure we have enough columns
                name = row[0].strip()
                date = row[1].strip()
                hours = row[2].strip()
                activities = clean_activities(row[5])
                
                # Remove surrounding quotes if present
                name = name.strip('\"')
                date = date.strip('\"')
                activities = activities.strip('\"')
                
                # Quote fields containing commas
                if ',' in name:
                    name = f'\"{name}\"'
                if ',' in date:
                    date = f'\"{date}\"'
                if ',' in activities:
                    activities = f'\"{activities}\"'
                
                print(f'{name},{date},{hours},{activities}')
except Exception as e:
    print(f'Error: {e}', file=sys.stderr)
    sys.exit(1)
"

# Alternative Perl version for better CSV handling:
# perl -ne '
# chomp;
# if ($. == 1) { 
#     print "Name,Date,Billable Hours,Activities\n"; 
#     next; 
# }
# 
# # Simple CSV parsing that handles quoted fields
# my @fields = ();
# my $field = "";
# my $in_quotes = 0;
# 
# for my $char (split //, $_) {
#     if ($char eq "\"") {
#         $in_quotes = !$in_quotes;
#     } elsif ($char eq "," && !$in_quotes) {
#         push @fields, $field;
#         $field = "";
#     } else {
#         $field .= $char;
#     }
# }
# push @fields, $field;  # Last field
# 
# if (@fields >= 6) {
#     my ($name, $date, $hours, $activities) = @fields[0,1,2,5];
#     
#     # Clean up quotes
#     for ($name, $date, $activities) {
#         s/^"//; s/"$//;
#     }
#     
#     # Remove URLs and parentheses from activities
#     $activities =~ s/\(https?:\/\/[^)]*\)//g;
#     $activities =~ s/,\s*,/,/g;
#     $activities =~ s/^\s*,|,\s*$//g;
#     $activities =~ s/\s+/ /g;
#     $activities =~ s/^\s+|\s+$//g;
#     
#     # Quote fields with commas
#     for ($name, $date, $activities) {
#         $_ = "\"$_\"" if /,/;
#     }
#     
#     print "$name,$date,$hours,$activities\n";
# }
# ' "$INPUT_FILE"
