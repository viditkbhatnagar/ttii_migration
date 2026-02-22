<form action="<?=base_url('admin/course/add_faq')?>" method="post">
    <div class="row">
        <div class="col-12 form-group p-2">
            <label for="question" class="form-label">Question<span class="required text-danger">*</span></label>
            <textarea class="form-control" id="question" name="question" required></textarea>
        </div>
        
        <div class="col-12 form-group p-2">
            <label for="answer" class="form-label">Answer<span class="required text-danger">*</span></label>
            <textarea class="form-control" id="answer" name="answer" required></textarea>

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