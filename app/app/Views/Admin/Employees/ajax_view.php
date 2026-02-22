<?php
    if (isset($view_data)){
        ?>
        <div class="user-profile text-center">
            
            <div class="card">
                <div class="card-body">
                    <div class="profile-picture mt-4">
                        <?php if(valid_file($view_data['profile_picture'])){ ?>
                            <img src="<?=base_url(get_file($view_data['profile_picture']))?>" alt="Profile Image" class="img-fluid rounded-circle" style="width: 150px; height: 150px;" />
                        <?php }else{ ?>
                            <img src="<?=base_url()?>assets/app/images/place-holder/profile-place-holder.jpg" alt="Profile Image" class="img-fluid rounded-circle" style="width: 150px; height: 150px;" />
                        <?php } ?>
                    </div>
                    <h5 class="name fs-20 mb-1"><?=$view_data['name']?></h5>
                    <p class="designation text-muted mb-0"><?=$view_data['employee_code']?></p>
                    <p class="designation text-muted mb-0"><?=!empty($designation[$view_data['user_designation_id']]) ? ($designation[$view_data['user_designation_id']] ?? '') : ''?></p>
                    <div class="table-responsive mt-5">
                        <table class="table table-bordered text-start">
                            <tbody>
                                <tr>
                                    <th class="ps-2" scope="row">Mobile :</th>
                                    <td class="text-muted"><?=$view_data['phone']?></td>
                                </tr>
                                <tr>
                                    <th class="ps-2" scope="row">E-mail :</th>
                                    <td class="text-muted"><?=$view_data['email']?></td>
                                </tr>
                                <tr>
                                    <th class="ps-2" scope="row">Team :</th>
                                    <td class="text-muted"><?= !empty($team_members[$view_data['id']]) ? ($teams[$team_members[$view_data['id']]] ?? 'No Team') : 'No Team'?>
                                    </td>
                                </tr>
                                <tr>
                                    <th class="ps-2" scope="row">Date of Birth</th>
                                    <td class="text-muted"><?=date('d-M-Y', strtotime($view_data['dob']))?></td>
                                </tr>
                                <tr>
                                    <th class="ps-2" scope="row">Joining Date</th>
                                    <td class="text-muted"><?=date('d-M-Y', strtotime($view_data['jod']))?></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div><!-- end card body -->
            </div>
        </div>
        <?php
    }
?>
