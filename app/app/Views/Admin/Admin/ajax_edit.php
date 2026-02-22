<?php
    if (isset($edit_data)){
        ?>
        <form action="<?=base_url('admin/admin/edit/'.$edit_data['id'])?>" method="post">
            <div class="row">
                <div class="col-12 form-group p-2">
                    <label for="name" class="form-label">Name<span class="required text-danger">*</span></label>
                    <input type="text" class="form-control" name="name" id="name" placeholder="Name" value="<?=$edit_data['name']?>" required>
                </div>
                <div class="col-12 form-group p-2">
                    <label for="phone" class="form-label">Phone<span class="required text-danger">*</span></label>
                    <input type="text" class="form-control" name="phone" id="phone" placeholder="Phone" value="<?=$edit_data['phone']?>" required>
                </div>
                <div class="col-12 form-group p-2">
                    <label for="email" class="form-label">Email<span class="required text-danger">*</span></label>
                    <input type="email" class="form-control" name="email" id="email" placeholder="Email" value="<?=$edit_data['email']?>" required>
                </div>
                <div class="col-12 p-2">
                    <button class="btn btn-outline-primary float-end" type="submit"><i class="ri-check-fill"></i>Save</button>
                </div>
            </div>
        </form>
        <?php
    }
?>