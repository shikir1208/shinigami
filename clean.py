import os
import re

def clean_file(src, dst):
    if not os.path.exists(src):
        print(f"Skipping {src}, does not exist.")
        return
    
    with open(src, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove HTTrack comments
    content = re.sub(r'<!-- Mirrored from.*?-->\n?', '', content)
    content = re.sub(r'<!-- Added by HTTrack -->.*?<!-- /Added by HTTrack -->\n?', '', content)
    
    # Replace relative CDN paths
    content = content.replace('../www.gstatic.com/', 'https://www.gstatic.com/')
    content = content.replace('../fonts.googleapis.com/', 'https://fonts.googleapis.com/')
    content = content.replace('../fonts.gstatic.com/', 'https://fonts.gstatic.com/')
    
    # Fix HTML entity encoding in URLs (specifically &amp;)
    def fix_amp(match):
        return match.group(0).replace('&amp;', '&')
    
    content = re.sub(r'href="https://fonts\.googleapis\.com/[^"]+"', fix_amp, content)

    with open(dst, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Cleaned and saved {dst}")

src_dir = r"c:\Users\igame\alpha1\AlphaNULL\alpha1-10be6.web.app"
dst_dir = r"c:\Users\igame\alpha1"

clean_file(os.path.join(src_dir, 'index.html'), os.path.join(dst_dir, 'index.html'))
clean_file(os.path.join(src_dir, 'dashboard.html'), os.path.join(dst_dir, 'dashboard.html'))
clean_file(os.path.join(src_dir, 'alpha1-viz.html'), os.path.join(dst_dir, 'alpha1-viz.html'))
clean_file(os.path.join(src_dir, 'patient.html'), os.path.join(dst_dir, 'patient.html'))
