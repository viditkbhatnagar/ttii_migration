<form action="<?=base_url('admin/books/enrol_course')?>" method="post">
    <div class="row">
        
        <input type="hidden" name="book_id" value="<?=$book?>">
        <div class="col-12 form-group p-2">
            <label for="chapter_id" class="form-label">Chapter<span class="required text-danger">*</span></label>
            <select class="form-control select2" name="course_id" id="course_id" required>
                <option value="">None</option>
                <?php foreach($book as $val){ ?>
                <option value="<?=$val['id']?>"><?=$val['title']?></option>
                <?php } ?>
            </select>
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
      $("#course_id").select2({
        dropdownParent: $("#small_modal")
      });
});
</script>