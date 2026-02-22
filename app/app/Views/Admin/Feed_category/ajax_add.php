<form action="<?=base_url('admin/feed_category/add')?>" method="post">
    <div class="row">
        <div class="col-12 form-group p-2">
            <label for="title" class="form-label">Category Title<span class="required text-danger">*</span></label>
            <input type="text" class="form-control" id="title" name="title" placeholder="Title" required>
        </div>
        <div class="col-12 p-2">
            <button class="btn btn-success float-end btn-save" type="submit">
                <i class="ri-check-fill"></i> Save
            </button>
        </div>
    </div>
</form>
  
<script>
    $(document).ready(function() {
        // Initialize Select2 on the select element
        $('#course_id').select2();
    });
</script>