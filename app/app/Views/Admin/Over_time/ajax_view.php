<div class="row mb-3">
    <div class="text-end">
        <button class="btn btn-success" onclick="show_ajax_modal('<?=base_url('app/over_time/ajax_add/'.$date)?>', 'Create OVER TIME')"><i class="ri-add-fill"></i> Add</button>
    </div>
</div>

<div class="row">
    <table class="table table-bordered nowrap table-striped align-middle">
        <tbody>
            <tr>
                <th>#</th>
                <th>Remarks</th>
                <th>Date & Time</td>
                <th>Status</td>
                <th>Approver Remark</td>
                <th>Action</td>
            </tr>
            <?php foreach($over_time_data as $key => $over_time) { ?>
                <tr>
                    <th><?=++$key?></th>
                    <th><?=$over_time['remarks']?></th>
                    <td><?= DateTime::createFromFormat('Y-m-d H:i:s', $over_time['start_time'])->format('d-m-Y g:i A')?> TO <?= DateTime::createFromFormat('Y-m-d H:i:s', $over_time['end_time'])->format('d-m-Y g:i A')?></td>
                    <td>
                        <?php if($over_time['is_approved'] == 2){ ?>
                            <span class="badge badge-label fs-11 bg-success"><i class="mdi mdi-circle-medium"></i>Approved</span>
                        <?php } else if($over_time['is_approved'] == 0){ ?>
                            <span class="badge badge-label fs-11 bg-danger"><i class="mdi mdi-circle-medium"></i>Rejected</span>
                        <?php } else if($over_time['is_approved'] == 1){  ?>
                            <span class="badge badge-label fs-11 bg-secondary"><i class="mdi mdi-circle-medium"></i>Waiting</span>
                        <?php } ?>
                    </td>
                    <td>
                        <?=$over_time['approved_remarks']?>
                    </td>
                    <td>
                        <?php if($over_time['is_approved']==1) { ?>
                            <a class="btn btn-sm" href="javascript::void()" onclick="delete_modal('<?=base_url('app/over_time/delete/'.$over_time['id'])?>')"><i class="ri-delete-bin-fill text-danger"></i></a>
                        <?php } ?>
                    </td>
                </tr>
            <?php } ?>
        </tbody>
    </table>
</div>