<form action="<?=base_url('admin/sub_admin/add')?>" method="post">
    <div class="row">
        <div class="col-12 form-group p-2">
            <label for="name" class="form-label">Name<span class="required text-danger">*</span></label>
            <input type="text" class="form-control" name="name" id="name" placeholder="Name" required>
        </div>
         <!-- Phone -->
        <div class="col-12 p-2">
            <div class="form-group">
                <label for="phone" class="form-label">Phone <span class="text-danger">*</span></label>
                <div class="input-group">
                    <select class="form-control" name="code" style="max-width: 130px;" required>
                        <?php foreach ($country_code as $code => $country) {
                            echo "<option value=\"$code\" >$code - $country</option>";
                        } ?>
                    </select>
                <input type="number" name="phone" id="phone" class="form-control" oninput="number_length(15, 'phone')" placeholder="Enter phone no" required value="<?= isset($edit_data['phone']) ? $edit_data['phone'] : '' ?>">
                </div>
            </div>
        </div>
        <div class="col-12 form-group p-2">
            <label for="email" class="form-label">Email<span class="required text-danger">*</span></label>
            <input type="email" class="form-control" name="email" id="email" placeholder="Email" required>
        </div>
        <div class="col-12 form-group p-2">
            <label for="password" class="form-label">Password<span class="required text-danger">*</span></label>
            <input type="password" class="form-control" name="password" id="password" placeholder="Password" required>
        </div>
        <div class="col-12 p-2">
            <button class="btn btn-outline-primary float-end" type="submit"><i class="ri-check-fill"></i>Save</button>
        </div>
    </div>
</form>