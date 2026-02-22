<form action="<?= base_url('admin/Students/edit_password/'.$edit_data['id']) ?>" method="post">
    <div class="row g-3">
        
        <div class="col-12">
            <div>
                <label for="username" class="form-label">Username</label>
                <input type="text" class="form-control" id="username" name="username"  placeholder="Enter Username" value="<?= $edit_data['username'] ?>" />
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