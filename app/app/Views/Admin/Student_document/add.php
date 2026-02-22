<form action="<?= base_url('admin/students/document_add/'.$id) ?>" method="post" enctype="multipart/form-data">
    <div class="row">
        <div class="col-12 col-md-6">
            <div class="form-group">
                <label for="label" class="form-label">Label</label>
                <input type="text" class="form-control" id="label" name="label" placeholder="Enter document label" required >
            </div>
        </div>

        <div class="col-12 col-md-6">
            <div class="form-group">
                <label for="file" class="form-label">File</label>
                <input type="file" class="form-control" id="file" name="file" required >
            </div>
        </div>

        <div class="col-12">
            <div class="text-end mt-3">
                <button type="submit" class="btn btn-success">
                    <i class="ri-check-fill me-1"></i>Save
                </button>
            </div>
        </div>
    </div>
</form>