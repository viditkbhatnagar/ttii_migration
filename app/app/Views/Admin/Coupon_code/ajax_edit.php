<form action="<?=base_url('admin/coupon_code/edit/'.$edit_data['id'])?>" method="post" enctype="multipart/form-data">
    <div class="row">
        <div class="col-6 form-group p-2">
            <label for="title" class="form-label">Package<span class="required text-danger">*</span></label>
           <select class="form-control select2" name="package_id" id="package_id">
               <option value="0">All Package</option>
                <?php foreach($packages as $package) {?>
                    <option value="<?=$package['id']?>"<?=($edit_data['package_id']==$package['id']) ? 'selected' : '' ?>><?=$package['title']?></option>
                <?php } ?>    
           </select>
        </div>
        <div class="col-6 form-group p-2">
            <label for="title" class="form-label">Users<span class="required text-danger">*</span></label>
           <select class="form-control select2" name="user_id" id="user_id" >
               <option value="0">All Users</option>
               <?php foreach($users as $user) { ?>
                    <option value="<?=$user['id']?>" <?=($edit_data['user_id']==$user['id']) ? 'selected' : '' ?>><?=$user['name']?></option>
                <?php } ?>    
           </select>
        </div>
        <div class="col-6 form-group p-2">
            <label for="title" class="form-label">No of times<span class="required text-danger">*</span></label>
            <input type="number" class="form-control" name="total_no" value="<?=$edit_data['total_no']?>" required>
        </div>
        <div class="col-6 form-group p-2">
            <label for="title" class="form-label">No of times per user<span class="required text-danger">*</span></label>
            <input type="number" class="form-control" name="per_user_no" value="<?=$edit_data['per_user_no']?>" required>
        </div>
        <div class="col-6 form-group p-2">
            <label for="title" class="form-label">Start Date<span class="required text-danger">*</span></label>
            <input type="date" class="form-control" name="start_date" value="<?=$edit_data['start_date']?>" required>
        </div>
        <div class="col-6 form-group p-2">
            <label for="title" class="form-label">End Date<span class="required text-danger">*</span></label>
            <input type="date" class="form-control" name="end_date" value="<?=$edit_data['end_date']?>" required>
        </div>
        <div class="col-6 form-group p-2">
            <label for="title" class="form-label">Coupon Code<span class="required text-danger">*</span></label>
            <input type="number" class="form-control" name="code" value="<?=$edit_data['code']?>" required>
        </div>
        <div class="col-6 form-group p-2">
            <label for="title" class="form-label">Discount</label>
            <input type="number" class="form-control" value="<?=$edit_data['discount_perc']?>" name="discount_perc" >
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
      $("#package_id").select2({
        dropdownParent: $("#ajax_modal")
      });
});

$(document).ready(function() {
      $("#user_id").select2({
        dropdownParent: $("#ajax_modal")
      });
});
    
    $(document).ready(function() {
        // Initialize CKEditor
        ClassicEditor
            .create( document.querySelector( '#editor' ) )
            .catch( error => {
                console.error( error );
            } );
    });

</script>