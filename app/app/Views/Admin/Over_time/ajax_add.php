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

<form action="<?=base_url('app/over_time/add')?>" method="post">
    <div class="row">
        <div class="col-lg-12">
            
            <div class="row">
                <div class="col-md-6 mb-3">
                    <input type="hidden" class="form-control" id="date" value="<?=$date?>" name="date">
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-6 mb-3">
                    <label for="start_time" class="form-label">Start Time</label>
                    <input type="datetime-local" class="form-control" id="start_time" name="start_time" required>
                </div>
                
                <div class="col-md-6 mb-3">
                    <label for="end_time" class="form-label">End Time</label>
                    <input type="datetime-local" class="form-control" id="end_time" name="end_time" required>
                </div>
            </div>

            
            <div class="mb-3">
                 <label for="remarks" class="form-label">Remarks</label>
                <textarea  type="text" class="form-control" id="remarks" name="remarks" ></textarea>
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