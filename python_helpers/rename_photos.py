import os
import re
import argparse

def natural_sort_key(s):
    return [int(text) if text.isdigit() else text.lower() for text in re.split(r'(\d+)', s)]

def extract_number(filename):
    match = re.search(r'\d+', filename)
    if match:
        return int(match.group())
    return None

def perform_renaming(seniors_dir, mode):
    if not os.path.exists(seniors_dir):
        return f"Error: Seniors directory does not exist at {seniors_dir}"

    subdirs = [d for d in os.listdir(seniors_dir) if os.path.isdir(os.path.join(seniors_dir, d))]
    total_renamed = 0
    report = []
    
    for subdir in sorted(subdirs):
        senior_name_prefix = "".join(subdir.split())
        subdir_path = os.path.join(seniors_dir, subdir)
        
        files = [f for f in os.listdir(subdir_path) if os.path.isfile(os.path.join(subdir_path, f))]
        sorted_files = sorted(files, key=natural_sort_key)
        
        report.append(f"\nProcessing Folder: {subdir}")
        report.append("-" * 40)
        
        if mode == "sequential":
            # Step 1: Rename to temporary names to prevent any collision
            temp_renames = []
            for idx, file in enumerate(sorted_files):
                file_path = os.path.join(subdir_path, file)
                ext = os.path.splitext(file)[1]
                temp_name = f"__temp_{idx:03d}__" + ext
                temp_path = os.path.join(subdir_path, temp_name)
                
                try:
                    os.rename(file_path, temp_path)
                    temp_renames.append((temp_path, idx, ext))
                except Exception as e:
                    report.append(f"  Error during temp rename of {file}: {e}")
                    
            # Step 2: Rename from temporary names to final sequential names
            for temp_path, idx, ext in temp_renames:
                final_name = f"{senior_name_prefix}_{idx+1:02d}{ext}"
                final_path = os.path.join(subdir_path, final_name)
                
                try:
                    os.rename(temp_path, final_path)
                    report.append(f"  {sorted_files[idx]} -> {final_name}")
                    total_renamed += 1
                except Exception as e:
                    report.append(f"  Error during final rename to {final_name}: {e}")
        else:
            # gap_fill mode: Keep existing numbers and fill remaining slots
            # Find which files have numbers <= 20
            numbered_files = []
            other_files = []
            for f in sorted_files:
                num = extract_number(f)
                if num is not None and num <= 20:
                    numbered_files.append((f, num))
                else:
                    other_files.append(f)
                    
            # Map of number -> original filename
            mapping = {}
            used_numbers = set()
            for f, num in numbered_files:
                mapping[num] = f
                used_numbers.add(num)
                
            # Fill gaps (1 to 20) with other files
            gaps = [n for n in range(1, 21) if n not in used_numbers]
            for idx, f in enumerate(other_files):
                if idx < len(gaps):
                    mapping[gaps[idx]] = f
                    
            # Perform rename via temp step to prevent collisions
            temp_renames = []
            for num in sorted(mapping.keys()):
                file = mapping[num]
                file_path = os.path.join(subdir_path, file)
                ext = os.path.splitext(file)[1]
                temp_name = f"__temp_{num:03d}__" + ext
                temp_path = os.path.join(subdir_path, temp_name)
                
                try:
                    os.rename(file_path, temp_path)
                    temp_renames.append((temp_path, num, ext, file))
                except Exception as e:
                    report.append(f"  Error during temp rename of {file}: {e}")
                    
            for temp_path, num, ext, orig_file in temp_renames:
                final_name = f"{senior_name_prefix}_{num:02d}{ext}"
                final_path = os.path.join(subdir_path, final_name)
                
                try:
                    os.rename(temp_path, final_path)
                    report.append(f"  {orig_file} -> {final_name}")
                    total_renamed += 1
                except Exception as e:
                    report.append(f"  Error during final rename to {final_name}: {e}")
                    
    report.append("\n" + "="*50)
    report.append("Renaming Complete!")
    report.append(f"Total files successfully numbered: {total_renamed}")
    report.append("="*50)
    return "\n".join(report)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Rename senior photos")
    parser.add_argument("--dir", required=True, help="Path to Seniors folder")
    parser.add_argument("--mode", default="sequential", choices=["sequential", "gap_fill"], help="Renaming mode")
    args = parser.parse_args()
    
    print(perform_renaming(args.dir, args.mode))
