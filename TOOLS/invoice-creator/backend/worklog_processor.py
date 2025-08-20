import csv
import re
import sys
from typing import List, Dict, Any
from io import StringIO


def clean_activities(text: str) -> str:
    """Clean activities text by removing URLs and normalizing whitespace."""
    if not text:
        return ''
    
    # Remove URLs with surrounding parentheses
    text = re.sub(r'\(https?://[^)]*\)', '', text)
    
    # Clean up extra spaces and commas
    text = re.sub(r',\s*,', ',', text)  # Remove empty entries between commas
    text = re.sub(r',\s*$', '', text)   # Remove trailing comma and space
    text = re.sub(r'^\s*,', '', text)   # Remove leading comma and space
    text = re.sub(r'\s+', ' ', text)    # Normalize multiple spaces
    text = re.sub(r'\s*,\s*', ', ', text)  # Normalize comma spacing
    
    return text.strip()


def process_worklog_csv(file_content: str) -> List[Dict[str, Any]]:
    """
    Process worklog CSV content and return cleaned data.
    
    Args:
        file_content: String content of the CSV file
        
    Returns:
        List of dictionaries with keys: name, date, hours, activities
    """
    results = []
    
    try:
        csvfile = StringIO(file_content)
        reader = csv.reader(csvfile)
        
        # Skip header row
        next(reader)
        
        for row in reader:
            if len(row) >= 6:  # Ensure we have enough columns
                name = row[0].strip().strip('"')
                date = row[1].strip().strip('"')
                hours = row[2].strip()
                activities = clean_activities(row[5]).strip('"')
                
                results.append({
                    'name': name,
                    'date': date,
                    'hours': hours,
                    'activities': activities
                })
                
    except Exception as e:
        raise ValueError(f'Error processing CSV: {e}')
    
    return results


def process_worklog_csv_to_csv_string(file_content: str) -> str:
    """
    Process worklog CSV content and return as cleaned CSV string.
    
    Args:
        file_content: String content of the CSV file
        
    Returns:
        Cleaned CSV string with header
    """
    results = process_worklog_csv(file_content)
    
    output = StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
    
    # Write header
    writer.writerow(['Name', 'Date', 'Billable Hours', 'Activities'])
    
    # Write data rows
    for row in results:
        writer.writerow([
            row['name'],
            row['date'],
            row['hours'],
            row['activities']
        ])
    
    return output.getvalue()


def process_worklog_file(input_file_path: str) -> List[Dict[str, Any]]:
    """
    Process worklog CSV file and return cleaned data.
    
    Args:
        input_file_path: Path to the CSV file
        
    Returns:
        List of dictionaries with keys: name, date, hours, activities
    """
    try:
        with open(input_file_path, 'r', encoding='utf-8') as csvfile:
            content = csvfile.read()
            return process_worklog_csv(content)
    except Exception as e:
        raise ValueError(f'Error reading file {input_file_path}: {e}')


if __name__ == '__main__':
    """Command line interface for backward compatibility."""
    if len(sys.argv) != 2:
        print("Usage: python worklog_processor.py <csv_file>")
        sys.exit(1)
    
    input_file = sys.argv[1]
    
    try:
        csv_output = process_worklog_csv_to_csv_string(
            open(input_file, 'r', encoding='utf-8').read()
        )
        print(csv_output, end='')
    except Exception as e:
        print(f'Error: {e}', file=sys.stderr)
        sys.exit(1)