<?php
if (isset($edit_data)){
?>
<form action="<?=base_url('admin/counsellor_target/edit/').$edit_data['counsellor_target_id'] ?>" method="post" enctype="multipart/form-data" id="myForm">
    <div class="row">
        
        <!-- type -->
       <div class="col-12 col-md-6 form-group p-2">
            <label for="type" class="form-label">Target Type<?= $edit_data['type'] ?><span class="required text-danger">*</span></label>
            <select class="form-control" name="type" id="type" required>
                <option value="" disabled>Select target type</option>
                <option value="1" <? $edit_data['type'] == '1' ? 'selected' : '' ?>>Point</option>
                <option value="2" <? $edit_data['type'] == '2' ? 'selected' : '' ?>>Application</option>
            </select>
        </div>
        
        <div class="col-12 col-md-6 form-group p-2">
            <label for="value" class="form-label">Count/Point<span class="required text-danger">*</span></label>
            <input type="number" class="form-control" name="value" id="value" required value="<?= $edit_data['value'] ?>" placeholder="Enter point or application count">
        </div>
        
        <div class="col-12 col-md-6 form-group p-2">
            <label for="from_date" class="form-label">From Date<span class="required text-danger">*</span></label>
            <input type="date" class="form-control" name="from_date" id="from_date" required value="<?= $edit_data['from_date'] ?>">
        </div>
        
        <div class="col-12 col-md-6 form-group p-2">
            <label for="to_date" class="form-label">To Date<span class="required text-danger">*</span></label>
            <input type="date" class="form-control" name="to_date" id="to_date" required value="<?= $edit_data['to_date'] ?>">
        </div>
        

        <!-- Submit Button -->
        <div class="col-12 p-2">
            <button class="btn btn-success float-end" type="submit"><i class="ri-check-fill"></i> Save</button>
        </div>
    </div>
</form>

<?php
}
?>
