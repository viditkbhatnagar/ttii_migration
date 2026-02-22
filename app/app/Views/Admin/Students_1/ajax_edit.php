<form action="<?= base_url('app/students/edit/' . $edit_data['id']) ?>" method="post">
    <div class="row">
        
        <!-- Name Field -->
        <div class="col-12 col-md-6 form-group p-2">
            <label for="name" class="form-label">Name<span class="required text-danger">*</span></label>
            <input type="text" class="form-control" id="name" name="name" placeholder="Enter student name" required value="<?= $edit_data['name'] ?>">
        </div>
        
        
        <!-- Gender Field -->
        <div class="col-12 col-md-6">
            <label for="gender" class="form-label">Gender<span class="required text-danger">*</span></label>
            <div class="hstack gap-2 flex-wrap">
                <input type="radio" class="btn-check" name="gender" id="gender-male" <?= ($edit_data['gender'] === 'Male') ? 'checked' : '' ?> value="Male">
                <label class="btn btn-outline-primary" for="gender-male">Male</label>
            
                <input type="radio" class="btn-check" name="gender" id="gender-female" <?= ($edit_data['gender'] === 'Female') ? 'checked' : '' ?> value="Female">
                <label class="btn btn-outline-primary" for="gender-female">Female</label>
            </div>
        </div>
        
        <!-- Phone Field -->
        <div class="col-12 col-md-6 form-group p-2">
            <label for="phone" class="form-label">Phone <span class="text-danger">*</span></label>
            <div class="col-sm-12">
                <div class="input-group">
                    <div class="col-sm-3">
                        <select class="form-control" name="code">
                            <?php
                                foreach ($country_code as $code => $country) {
                                    $selected = ($edit_data['code'] == $code) ? 'selected' : '';
                                    echo "<option value=\"$code\" $selected>$code - $country</option>";
                                }
                            ?>
                        </select>
                    </div>
                    <div class="col-sm-9">
                        <input type="number" name="phone" id="phone" class="form-control" oninput="number_length(15, 'phone')" placeholder="Enter phone no" required value="<?= $edit_data['phone'] ?>"/>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Date of Birth -->
        <div class="col-12 col-md-6 form-group p-2">
            <label for="DOB" class="form-label">Date of birth<span class="required text-danger">*</span></label>
            <input type="date" class="form-control" id="DOB" name="DOB" placeholder=" " required value="<?= $edit_data['dob'] ?>">
        </div>
        
        <!-- Email Field -->
        <div class="col-12 col-md-6 form-group p-2">
            <label for="email" class="form-label">Email<span class="required text-danger">*</span></label>
            <input type="email" class="form-control" id="email" name="email" placeholder="Enter student email" required value="<?= $edit_data['email'] ?>">
        </div>

        <div class="col-12 col-md-6 form-group p-2">
            <label for="whatsapp_no" class="form-label">WhatsApp No</label>
            <input type="tel" class="form-control" id="whatsapp_no" name="whatsapp_no"  placeholder="Enter student WhatsApp No" value="<?= $edit_data['whatsapp_no'] ?>">
        </div>
        
        <!-- Address Field -->
        <div class="col-12 form-group p-2">
            <label for="address" class="form-label">Address<span class="required text-danger">*</span></label>
            <input type="text" class="form-control" id="address" name="address" placeholder="Enter student address" required value="<?= $edit_data['address'] ?>">
        </div>
        
        
        <div class="col-12 col-md-6 form-group p-2">
            <label for="referred_by" class="form-label">Referred by</label>
            <select class="form-control select2" name="referred_by" id="referred_by">
                <option value="0">Choose client</option>
                <?php
                    foreach($clients as $key => $client){
                        $selected = ($edit_data['referred_by'] == $key) ? 'selected' : '';
                        echo "<option value=\"$key\" $selected>$client</option>";
                    } 
                ?>
            </select>
        </div>
        
        <div class="col-12 col-md-6 form-group p-2">
            <label for="student_status" class="form-label">Choose Student Status<span class="required text-danger">*</span></label>
            <select class="form-control" name="status" id="student_status" required>
                <option value="">Select any status</option>
                <option <?= ($edit_data['status'] == 1) ? 'selected' : '' ?> value="1">Active</option>
                <option <?= ($edit_data['status'] == 0) ? 'selected' : '' ?> value="0">Inactive</option>
            </select>
        </div>
        
        <div class="col-12 p-2">
            <button class="btn btn-success float-end btn-save" type="submit">
                <i class="ri-check-fill"></i> Update
            </button>
        </div>

    </div>
</form>

<script>
$(document).ready(function() {
    $('.select2').select2({
        dropdownParent: $("#ajax_modal")
    });
    document.getElementById('DOB').max = new Date().toISOString().split('T')[0];
});
</script>
