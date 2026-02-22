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
                    <th>Phone</th>
                    <td>+<?=$view_data['code']?> <?=$view_data['phone']?></td>
                </tr>
                <tr>
                    <th>Email</th>
                    <td><?=$view_data['email']?></td>
                </tr>
                <tr>
                    <th>No of admissions</th>
                    <td><?=$view_data['total_students']?></td>
                </tr>
                <tr>
                    <th>Enrolled Students</th>
                    <td>
                        <?php if(COUNT($view_data['students']) > 0){
                            ?>
                            <ul>
                                <?php
                                foreach($view_data['students'] as $student){
                                    echo "<li>".$student['name']."</li>";
                                }
                                ?>
                        </ui>
                        <?php } else { ?>
                        <span class="text-danger">No students enrolled yet</span>
                        <?php } ?>
                    </td>
                </tr>
                <tr>
                    <th>Total revenue</th>
                    <td>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="#000000" width="15px" height="15px" viewBox="-96 0 512 512"><path d="M308 96c6.627 0 12-5.373 12-12V44c0-6.627-5.373-12-12-12H12C5.373 32 0 37.373 0 44v44.748c0 6.627 5.373 12 12 12h85.28c27.308 0 48.261 9.958 60.97 27.252H12c-6.627 0-12 5.373-12 12v40c0 6.627 5.373 12 12 12h158.757c-6.217 36.086-32.961 58.632-74.757 58.632H12c-6.627 0-12 5.373-12 12v53.012c0 3.349 1.4 6.546 3.861 8.818l165.052 152.356a12.001 12.001 0 0 0 8.139 3.182h82.562c10.924 0 16.166-13.408 8.139-20.818L116.871 319.906c76.499-2.34 131.144-53.395 138.318-127.906H308c6.627 0 12-5.373 12-12v-40c0-6.627-5.373-12-12-12h-58.69c-3.486-11.541-8.28-22.246-14.252-32H308z"/></svg>
                        <?=$view_data['total_fee_students']?>
                    </td>
                </tr>
                
            </tbody>
        </table>
        <?php
    }
?>
