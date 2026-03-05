# Bulk Facial Data Import Feature

## Overview
The Facial Data tab in the Attendance Management page now supports bulk imports of facial recognition images for multiple students at once, in addition to the existing single-student upload functionality.

## Features

### 1. **Toggle Mode (Single vs Bulk)**
- Located in the top-right of the Facial Data tab
- **Single Mode (👤)**: Upload images for one student at a time (original functionality)
- **Bulk Mode (📦)**: Upload images for multiple students at once

### 2. **Single Student Mode** (Original Functionality)
- Select a single student from the dropdown
- Upload multiple image files for that student
- Click the upload area or drag & drop images
- Supports PNG, JPG, and JPEG formats

### 3. **Bulk Import Mode** (New)
- Upload a folder structure with subfolders named after students
- Each subfolder contains the facial images for that student
- All files are processed and uploaded automatically
- Progress bar shows upload status

## How to Use Bulk Import

### Step 1: Prepare Folder Structure
Create a folder on your computer with the following structure:

```
FacialData/
├── Sadia Ahmed/
│   ├── photo1.jpg
│   ├── photo2.jpg
│   └── photo3.jpg
├── Adiba Rahman/
│   ├── photo1.jpg
│   ├── photo2.jpg
│   └── photo3.jpg
└── Ayesha Khan/
    ├── photo1.jpg
    └── photo2.jpg
```

### Step 2: Naming Convention
Folder names should match **student names exactly** as they appear in the system:
- Case-sensitive matching: "Sadia Ahmed" must match exactly
- Alternatively, you can use the student's MongoDB ObjectId (if known)
- The system performs case-insensitive fallback matching

### Step 3: Upload
1. Click the toggle to switch to **Bulk Mode**
2. Click the upload area or drag & drop your main folder
3. Select the folder containing all student subfolders
4. Wait for the progress bar to complete
5. Review the results message

### Step 4: Verification
- The message displays: `✅ Bulk import complete: X successful, Y failed (Z images)`
- Check browser console (F12) for detailed logs
- Facial embeddings are automatically reloaded after successful upload

## Technical Details

### File Processing
- **Recognized formats**: JPG, PNG, JPEG
- **Folder depth**: Files must be one level deep (in a student subfolder)
- **CSV support**: If a CSV file is included in the upload, it can map image filenames to students (for advanced use)

### Student Matching
1. Exact name match: Folder name matches a student name exactly
2. Case-insensitive match: Lowercase comparison
3. ID match: Folder name matches a student's MongoDB ObjectId

### Error Handling
- If a student is not found, that folder's upload is skipped
- Other students' uploads continue processing
- Failed uploads are logged in the results summary
- Check the browser console for detailed error messages

### API Integration
- Uses existing `/api/attendance/facial-upload` endpoint for each student
- Automatically calls `http://localhost:8000/reload-embeddings` after all uploads
- Maintains student image count statistics

## Best Practices

### Image Quality
- **Quantity**: 5-10 clear photos per student
- **Angles**: Different angles and orientations
- **Lighting**: Vary lighting conditions
- **Clarity**: Clear facial visibility
- **Recency**: Use recent, natural photos

### Folder Organization
- Keep the structure simple and flat
- Use student names exactly as they appear in the system
- Avoid special characters in folder names if possible
- Maximum 1-2 folder levels recommended

### Batch Processing
- For large batches, consider uploading 20-30 students at a time
- This prevents timeouts and makes debugging easier
- You can run multiple uploads sequentially

## Troubleshooting

### Issue: "Student not found"
- **Cause**: Folder name doesn't match any student in the system
- **Solution**: 
  - Copy the exact student name from the system
  - Check for spelling and capitalization
  - Use the MongoDB ObjectId if available

### Issue: Upload stuck at X%
- **Cause**: Network timeout or backend issue
- **Solution**:
  - Check if the server is running
  - Check browser console for errors
  - Try a smaller batch of students
  - Refresh and try again

### Issue: "No images uploaded"
- **Cause**: No image files found in subfolders
- **Solution**:
  - Ensure images are directly in student folders (not nested deeper)
  - Check file formats (must be JPG, PNG, or JPEG)
  - Verify folder structure

### Issue: Embeddings not reloading
- **Cause**: Backend CCTV service not responding
- **Solution**:
  - Ensure Python backend is running: `python main_v2.py`
  - Check port 8000 is accessible
  - See backend logs for errors

## Backend Requirements

### Python Backend
- Must be running on `http://localhost:8000`
- Requires `/reload-embeddings` endpoint
- Uses existing `/api/attendance/facial-upload` endpoint

### Database
- MongoDB must be running
- All students must exist in the database
- Student records must have `_id` and `name` fields

## Implementation Details

### New Component State Variables
```tsx
const [bulkImportMode, setBulkImportMode] = useState(false);
const [bulkImportProgress, setBulkImportProgress] = useState<{ current: number; total: number } | null>(null);
const bulkFileInputRef = useRef<HTMLInputElement>(null);
```

### New Function: `handleBulkFacialImport`
- Accepts a FileList of uploaded files
- Groups files by folder structure
- Processes each student's folder separately
- Displays progress and final results

### UI Changes
- Added toggle button in upload tab header
- Two separate UI modes (single vs bulk)
- Progress bar in bulk mode
- Improved instructions for bulk import

## Future Enhancements

Potential improvements for future versions:
1. CSV mapping file support for advanced workflows
2. ZIP file upload support
3. Batch size limit warnings
4. Upload history and analytics
5. Automatic folder structure generation templates
6. Excel spreadsheet mapping support
7. Rate limiting and quota management

## Support

For issues or questions:
1. Check the browser console (F12) for detailed logs
2. Review backend logs for API errors
3. Verify MongoDB and Python backend are running
4. Check student records exist in database
5. Ensure file formats are supported (PNG, JPG, JPEG)

---

**Version**: 1.0  
**Last Updated**: February 26, 2026  
**Status**: Production Ready
