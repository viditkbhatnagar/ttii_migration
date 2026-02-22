<form action="<?=base_url('admin/counsellor_target/add') ?>" method="post" enctype="multipart/form-data" id="myForm">
    <div class="row">
        
        <div class="col-12 col-md-6 form-group p-2">
            <label for="counsellor_id" class="form-label">Counsellor<span class="required text-danger">*</span></label>
            <select class="form-control select2" name="counsellor_id" id="counsellor_id" required>
                <option value="" disabled selected>Select Counsellor</option>
                <?php foreach($counsellors as $counsellor) { ?>
                    <option value="<?= $counsellor['id'] ?>"><?= $counsellor['name'] ?></option>
                <?php } ?>
            </select>
        </div>
        
        <!-- type -->
        <div class="col-12 col-md-6 form-group p-2">
            <label for="type" class="form-label">Target Type<span class="required text-danger">*</span></label>
            <select class="form-control" name="type" id="type" required>
                <option value="" disabled selected>Select target type</option>
                <option value="1">Point</option>
                <option value="2">Application</option>
            </select>
        </div>
        
        <div class="col-12 col-md-6 form-group p-2">
            <label for="value" class="form-label">Count/Point<span class="required text-danger">*</span></label>
            <input type="number" class="form-control" name="value" id="value" required  placeholder="Enter point or application count">
        </div>
        
        <div class="col-12 col-md-6 form-group p-2">
            <label for="from_date" class="form-label">From Date<span class="required text-danger">*</span></label>
            <input type="date" class="form-control" name="from_date" id="from_date" required>
        </div>
        
        <div class="col-12 col-md-6 form-group p-2">
            <label for="to_date" class="form-label">To Date<span class="required text-danger">*</span></label>
            <input type="date" class="form-control" name="to_date" id="to_date" required>
        </div>
        

        <!-- Submit Button -->
        <div class="col-12 p-2">
            <button class="btn btn-success float-end" type="submit"><i class="ri-check-fill"></i> Save</button>
        </div>
    </div>
</form>
<script>
     $(document).ready(function() {
        $(".select2").select2({
            dropdownParent: $("#ajax_modal")
        });
    });
</script>