<?php
    if (isset($edit_data)){
        ?>
        <form action="<?=base_url('app/user_role/edit/'.$edit_data['id'])?>" method="post">
            <div class="row">
                <div class="col-12 form-group p-2">
                    <label for="title" class="form-label">Title</label>
                    <input type="text" class="form-control" id="title" name="title" placeholder="Title" value="<?=$edit_data['title']?>">
                </div>
                <div class="col-12 p-2">
                    <button class="btn btn-outline-primary float-end" type="submit"><i class="ri-check-fill"></i>Save</button>
                </div>
            </div>
        </form>
        <?php
    }
?>