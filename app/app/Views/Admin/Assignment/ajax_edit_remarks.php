<form action="<?=base_url('admin/assignment/edit_remarks/'.$edit_data['id'])?>" enctype="multipart/form-data" method="post">
    <div class="row">
        <input type="hidden" name="id" value="<?=$edit_data['id']?>">
        
        <div class="col-lg-12 p-2">
            <label for="marks" class="form-label">Marks<span class="required text-danger">*</span></label><p>(Assignment Mark: <?=$assignment_marks?>)</p>
            <input type="number" class="form-control" name="marks" value="<?=$edit_data['marks']?>" required max="<?=(int)$assignment_marks?>">
        </div> 
        <div class="col-lg-12 p-2">
            <label for="remakrs" class="form-label">Remarks<span class="required text-danger">*</span></label>
            <input type="text" class="form-control" name="remarks" value="<?=$edit_data['remarks']?>" required>
        </div>  
        
        
        <div class="col-12 p-2">
            <button class="btn btn-success float-end btn-save" type="submit">
                <i class="ri-check-fill"></i> Save
            </button>
        </div>
    </div>
</form>
<script>
$(document).on('input', 'input[name="marks"]', function () {
    let max = parseInt(this.max);
    let val = parseInt(this.value);

    if (val > max) {
        this.value = max;
    }

    if (val < 0) {
        this.value = 0;
    }
});
</script>
