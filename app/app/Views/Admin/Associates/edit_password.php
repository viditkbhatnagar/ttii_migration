<form action="<?= base_url('admin/associates/edit_password/'.$edit_data['id']) ?>" method="post">
    <div class="row g-3">
        
        <div class="col-12">
            <div>
                <label for="username" class="form-label">Email</label>
                <input type="text" class="form-control" id="email" name="email"  placeholder="Enter email" value="<?= $edit_data['user_email'] ?>" />
            </div>
        </div>
        <div class="col-12">
            <div>
                <label for="password" class="form-label">Passowrd</label>
                <input type="password" class="form-control" id="password" name="password"  placeholder="Enter Password"  />
            </div>
        </div>
        <div class="col-12 p-2">
            <button class="btn btn-success float-end" type="submit"><i class="ri-check-fill"></i> Save</button>
        </div>
    </div>
</form>