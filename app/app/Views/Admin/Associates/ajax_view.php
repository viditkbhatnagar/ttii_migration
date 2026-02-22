<?php
if (isset($view_data)){
    ?>
    <table class="table table-nowrap table-striped-columns">
        <tbody>
            <tr>
                <th>Name</th>
                <td><?=$view_data['name']?></td>
            </tr>
            <tr>
                <th>Email</th>
                <td><?=$view_data['user_email']?></td>
            </tr>
            <tr>
                <th>Phone</th>
                <td>+<?=$view_data['country_code']?> <?=$view_data['phone']?></td>
            </tr>
            <tr>
                <th>Gender</th>
                <td><?=$view_data['gender']?></td>
            </tr>
            <tr>
                <th>Date of Birth</th>
                <td><?=$view_data['dob']?></td>
            </tr>
            <tr>
                <th>Nationality</th>
                <td><?=$view_data['country']?></td>
            </tr>
            <tr>
                <th>Languages Spoken</th>
                <td><?=$view_data['languages_spoken']?></td>
            </tr>
            <tr>
                <th>Highest Qualification</th>
                <td><?=$view_data['highest_qualification']?></td>
            </tr>
            <tr>
                <th>Date of Joining</th>
                <td><?=$view_data['date_of_joining']?></td>
            </tr>
            <tr>
                <th>Status</th>
                <td><?= $view_data['drop_out_status'] == '1' ? '<span class="badge bg-success">Active</span>' : '<span class="badge bg-danger">Inactive</span>' ?></td>
            </tr>
            <tr>
                <th>Profile Picture</th>
                <td>
                    <?php if (!empty($view_data['profile_picture'])) { ?>
                        <img src="<?= base_url(get_file($view_data['profile_picture'])) ?>" alt="Profile Picture" width="100" height="100">
                    <?php } else { ?>
                        <span class="text-danger">No profile picture uploaded</span>
                    <?php } ?>
                </td>
            </tr>
        </tbody>
    </table>
    <?php
}
?>
