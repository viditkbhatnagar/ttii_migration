<form action="<?= base_url('admin/students/document_edit/'.$edit_data['student_document_id']) ?>" method="post" enctype="multipart/form-data">
    <input type="text" value="<?= $edit_data['student_id'] ?>" class="d-none" name="student_id" >
    <div class="row">
        <div class="col-12 col-md-6">
            <div class="form-group">
                <label for="label" class="form-label">Label</label>
                <input type="text" class="form-control" id="label" name="label" placeholder="Enter document label" required 
                    value="<?= isset($edit_data['label']) ? $edit_data['label'] : '' ?>">
            </div>
        </div>

        <div class="col-12 col-md-6">
            <div class="form-group">
                <label for="file" class="form-label">File</label>
                <input type="file" class="form-control" id="file" name="file">
                <?php if (!empty($edit_data['file'])): ?>
                    <small class="text-muted">Current File: <a href="<?= base_url(get_file($edit_data['file'])) ?>" target="_blank">View Document</a></small>
                <?php endif; ?>
            </div>
        </div>

        <div class="col-12">
            <div class="text-end mt-3">
                <button type="submit" class="btn btn-success">
                    <i class="ri-check-fill me-1"></i>Update
                </button>
            </div>
        </div>
    </div>
</form>
