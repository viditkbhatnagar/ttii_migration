<form action="<?= base_url('admin/resources/add_file') ?>" enctype="multipart/form-data" method="post">
    <input type="hidden" name="folder_id" value="<?= $folder_id ?? 0 ?>">
     
    <div class="mb-3">
        <label class="form-label">Upload File</label>
        <input type="file" class="form-control" name="file" required>
    </div>
    
     <div class="mb-3">
        <button class="btn btn-success" type="submit">
            Upload File
        </button>
    </div>
</form>