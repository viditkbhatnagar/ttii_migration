<form action="<?=base_url('admin/admin/add')?>" method="post">
    <div class="row">
        <div class="col-12 form-group p-2">
            <label for="name" class="form-label">Name<span class="required text-danger">*</span></label>
            <input type="text" class="form-control" name="name" id="name" placeholder="Name" required>
        </div>
        <div class="col-12 form-group p-2">
            <label for="phone" class="form-label">Phone<span class="required text-danger">*</span></label>
            <input type="text" class="form-control" name="phone" id="phone" placeholder="Phone" required>
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