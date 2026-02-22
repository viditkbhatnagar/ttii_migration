 <style>
    /* Style for horizontal checkboxes */
    .horizontal-checkboxes {
        display: flex;
        gap: 10px; /* Adjust the gap between checkboxes */
    }

    /* Style for circular checkboxes */
    .circle-checkbox {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 2px solid #333;
        margin-right: 10px;
        cursor: pointer;
        padding: 16px!important;
    }

    /* Hide the actual checkbox */
    .circle-checkbox input {
        display: none;
    }

    /* Style for checked checkbox */
    .circle-checkbox input:checked + label {
        background-color: #3498db;
        color: #fff;
        border: 1px solid #3498db;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        padding: 8px!important;
        margin-top: 9px;
    }
</style>

<form action="<?=base_url('app/over_time/approve')?>" method="post">
    <div class="row">
        <div class="col-lg-12">
            
            <div class="row">
                <div class="col-md-6 mb-3">
                    <input type="hidden" class="form-control" id="id" value="<?=$id?>" name="id">
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-6 mb-3">
                    <label for="start_time" class="form-label">Status</label>
                    <select class="form-control" id="is_approved" name="is_approved" required>
                        <option value="1" <?php if($edit_data['is_approved'] == 1) echo "selected" ?>>Waiting</option>
                        <option value="2" <?php if($edit_data['is_approved'] == 2) echo "selected" ?>>Approve</option>
                        <option value="0" <?php if($edit_data['is_approved'] == 0) echo "selected" ?>>Reject</option>
                    </select>
                </div>
            </div>

            
            <div class="mb-3">
                 <label for="approved_remarks" class="form-label">Remarks</label>
                <textarea  type="text" class="form-control" id="approved_remarks" name="approved_remarks" ><?=$edit_data['approved_remarks']?></textarea>
            </div>

            <div class="hstack gap-2 justify-content-end">
                <button class="btn btn-success float-end" type="submit">
                    <i class="ri-check-fill"></i>
                    Save
                </button>
            </div>
        </div>
    </div>
</form>