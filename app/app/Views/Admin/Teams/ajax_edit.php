<?php
    if (isset($edit_data)){
        ?>
        <form action="<?=base_url('app/teams/edit/'.$edit_data['id'])?>" method="post" enctype="multipart/form-data">
            <div class="row">
                <div class="col-lg-12">
                    <div class="text-center mb-4 mt-n5 pt-2">
                        <div class="position-relative d-inline-block" style="margin-top: 30px;margin-bottom: 10px;">
                            <div class="position-absolute bottom-0 end-0">
                                <label for="member-image-input" class="mb-0"
                                    data-bs-toggle="tooltip" data-bs-placement="right"
                                    title="Select Team Image">
                                    <div class="avatar-xs">
                                        <div class="avatar-title bg-light border rounded-circle text-muted cursor-pointer">
                                            <i class="ri-image-fill"></i>
                                        </div>
                                    </div>
                                </label>
                                <input class="form-control d-none" value=""
                                    id="member-image-input" type="file" name="image"
                                    accept="image/png, image/gif, image/jpeg">
                            </div>
                            <div class="avatar-lg">
                                <div class="avatar-title bg-light rounded-circle">
                                    <?php if(valid_file($edit_data['image'])){ ?>
                                        <img src="<?=base_url(get_file($edit_data['image']))?>"
                                            id="user-profile-img"
                                            class="avatar-md rounded-circle h-auto" />
                                    <?php }else{ ?>
                                        <img src="<?=base_url()?>assets/app/images/place-holder/placeholder-image.png"
                                            id="user-profile-img"
                                            class="avatar-md rounded-circle h-auto" />
                                    <?php } ?>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="mb-3">
                        <label for="title" class="form-label">Team Name</label>
                        <input type="text" class="form-control" id="title" name="title"
                               placeholder="Enter team name" required value="<?=$edit_data['title'] ?>">
                        <div class="invalid-feedback">Please Enter a team name.</div>
                    </div>
        
                    <div class="mb-4">
                        <label for="description" class="form-label">Description</label>
                        <input type="text" class="form-control" id="description" name="description"
                               placeholder="Enter description" required value="<?=$edit_data['description'] ?>">
                        <div class="invalid-feedback">Please Enter a description.</div>
                    </div>
        
                    <div class="col-12 p-2">
                        <button class="btn btn-primary float-end" type="submit"><i class="ri-check-fill"></i>Update</button>
                    </div>
                </div>
            </div>
        </form>
        <?php
    }
?>

<!--profile image-->
<script>
    $(document).ready(function () {
        $('#member-image-input').change(function () {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    $('#user-profile-img').attr('src', e.target.result);
                };
                reader.readAsDataURL(file);
            }
        });
    });
</script>