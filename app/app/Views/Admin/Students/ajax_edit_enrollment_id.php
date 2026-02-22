<form action="<?= base_url('admin/Students/edit_enrollment_id/'.$edit_data['id']) ?>" method="post">
    <div class="row g-3">
        
        <div class="col-12">
            <div>
                <label for="enrollment_id" class="form-label">Enrollment ID</label>
                <input type="text" class="form-control" id="enrollment_id" name="enrollment_id"  placeholder="Enter Enrollment ID" value="<?= $edit_data['enrollment_id'] ?>" />
            </div>
        </div>

        <div class="col-12 p-2">
            <button class="btn btn-success float-end" type="submit"><i class="ri-check-fill"></i> Save</button>
        </div>
    </div>
</form>