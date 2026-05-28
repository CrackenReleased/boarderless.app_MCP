import os
import argparse
from PIL import Image
from pillow_heif import register_heif_opener

# Register HEIF opener with PIL
register_heif_opener()

def standardize(seniors_dir):
    if not os.path.exists(seniors_dir):
        return f"Error: Seniors directory does not exist at {seniors_dir}"
        
    subdirs = [d for d in os.listdir(seniors_dir) if os.path.isdir(os.path.join(seniors_dir, d))]
    
    modified_count = 0
    heic_converted = 0
    errors = 0
    report = []
    
    for subdir in sorted(subdirs):
        subdir_path = os.path.join(seniors_dir, subdir)
        files = [f for f in os.listdir(subdir_path) if os.path.isfile(os.path.join(subdir_path, f))]
        
        report.append(f"\nScanning Folder: {subdir}")
        report.append("-" * 40)
        
        for file in sorted(files):
            filepath = os.path.join(subdir_path, file)
            ext = os.path.splitext(file)[1].lower()
            
            if ext == ".heic":
                jpg_name = os.path.splitext(file)[0] + ".jpg"
                jpg_path = os.path.join(subdir_path, jpg_name)
                report.append(f"  HEIC -> JPG: {file} -> {jpg_name}")
                try:
                    with Image.open(filepath) as img:
                        rgb_img = img.convert("RGB")
                        rgb_img.save(jpg_path, "JPEG", progressive=False, quality=95)
                    os.remove(filepath)
                    heic_converted += 1
                except Exception as e:
                    report.append(f"    ERROR converting HEIC {file}: {e}")
                    errors += 1
                continue
                
            try:
                with Image.open(filepath) as img:
                    is_progressive = img.info.get("progressive", False)
                    is_cmyk = img.mode == "CMYK"
                    fmt = img.format
                    
                if (fmt == "JPEG" and is_progressive) or is_cmyk:
                    report.append(f"  Standardizing JPEG: {file} (Progressive: {is_progressive}, Mode: {img.mode})")
                    try:
                        with Image.open(filepath) as img:
                            rgb_img = img.convert("RGB")
                            temp_path = filepath + ".tmp"
                            rgb_img.save(temp_path, "JPEG", progressive=False, quality=95)
                        os.replace(temp_path, filepath)
                        modified_count += 1
                    except Exception as e:
                        report.append(f"    ERROR standardizing {file}: {e}")
                        errors += 1
            except Exception:
                pass
                
    report.append("\n" + "="*50)
    report.append("Standardization Complete!")
    report.append(f"JPEGs converted to baseline: {modified_count}")
    report.append(f"HEIC files converted to JPG: {heic_converted}")
    report.append(f"Errors encountered:           {errors}")
    report.append("="*50)
    return "\n".join(report)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Standardize images in Seniors folder")
    parser.add_argument("--dir", required=True, help="Path to Seniors folder")
    args = parser.parse_args()
    
    print(standardize(args.dir))
