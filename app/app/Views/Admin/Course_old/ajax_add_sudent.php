<form action="<?=base_url('admin/course/add_student_to_batch')?>" method="post">
    <div class="row">
        <div class="col-12 form-group p-2">
            <label for="user_id" class="form-label ">Student<span class="required text-danger">*</span></label>
            <select class="form-control select2" name="user_id" id="user_id" required>
                <option value="">None</option>
                <?php foreach($students as $val){ ?>
                        <option value="<?=$val['id']?>"><?=$val['name']?></option>
                <?php } ?>

            </select>
        </div>
        
        <input type="hidden" value="<?=$batch_id?>"  name="batch_id" id="batch_id">
    
    
        <div class="col-12 p-2">
            <button class="btn btn-success float-end btn-save" type="submit">
                <i class="ri-check-fill"></i> Save
            </button>
        </div>
    </div>
</form>
  
<script>
    $(document).ready(function() {
      $("#user_id").select2({
        dropdownParent: $("#small_modal")
      });
});
</script>